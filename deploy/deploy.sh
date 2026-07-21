#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

readonly repo_url="git@github-fish-catcher:evvolution/fish-catcher.git"
readonly deploy_branch="${MOYU_DEPLOY_BRANCH:-main}"
readonly runtime_dir="${MOYU_RUNTIME_DIR:-/www/wwwroot/nefelibata/fish}"
readonly runtime_parent="$(dirname -- "$runtime_dir")"
readonly releases_dir="$runtime_dir/releases"
readonly current_link="$runtime_dir/current"
readonly lock_path="${XDG_RUNTIME_DIR:-/tmp}/moyu-deploy.lock"
temporary_root=""

export PRISMA_ENGINES_MIRROR="${PRISMA_ENGINES_MIRROR:-https://cdn.npmmirror.com/binaries/prisma}"

fail() {
  printf '部署终止：%s\n' "$1" >&2
  exit 1
}

cleanup_temporary_source() {
  [[ -n "$temporary_root" && -d "$temporary_root" ]] || return
  case "$temporary_root" in
    "$runtime_parent"/.moyu-build.*) rm -rf -- "$temporary_root" ;;
    *) printf '拒绝清理异常临时目录：%s\n' "$temporary_root" >&2 ;;
  esac
}

trap cleanup_temporary_source EXIT
trap 'printf "部署失败（第 %s 行），当前 PM2 版本未主动切换。\n" "$LINENO" >&2' ERR

[[ "$deploy_branch" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]*$ ]] || fail "MOYU_DEPLOY_BRANCH 不合法"
[[ "$runtime_dir" = /* && "$runtime_dir" != "/" && "$runtime_parent" != "/" ]] || fail "运行目录不安全：$runtime_dir"

for required_command in git npm node pm2 flock install mktemp realpath; do
  command -v "$required_command" >/dev/null 2>&1 || fail "缺少命令：$required_command"
done

exec 9>"$lock_path"
flock -n 9 || fail "已有一次部署正在执行"

mkdir -p "$runtime_dir/deploy" "$releases_dir"
[[ -f "$runtime_dir/.env" ]] || fail "缺少 $runtime_dir/.env"

temporary_root="$(mktemp -d "$runtime_parent/.moyu-build.XXXXXX")"
readonly source_dir="$temporary_root/source"

printf '浅克隆 %s 分支到临时目录…\n' "$deploy_branch"
git clone --depth 1 --branch "$deploy_branch" --single-branch "$repo_url" "$source_dir"
install -m 600 "$runtime_dir/.env" "$source_dir/.env"

cd "$source_dir"
readonly revision="$(git rev-parse HEAD)"
readonly short_revision="$(git rev-parse --short HEAD)"

printf '安装锁定依赖并构建 %s…\n' "$short_revision"
npm ci --include=dev --no-audit --no-fund
npm run typecheck
npm run build
npm run prisma:migrate:deploy

readonly new_release="$releases_dir/$revision"
if [[ -e "$new_release" ]]; then
  [[ "$(dirname -- "$new_release")" == "$releases_dir" ]] || fail "发布目录越界"
  rm -rf -- "$new_release"
fi
mkdir -p "$new_release"
mv "$source_dir/.output" "$new_release/.output"

install -m 644 "$source_dir/ecosystem.config.cjs" "$runtime_dir/ecosystem.config.cjs"
install -m 755 "$source_dir/deploy/deploy.sh" "$runtime_dir/deploy/deploy.sh"
printf '%s\n' "$revision" > "$runtime_dir/REVISION.next"
mv -f "$runtime_dir/REVISION.next" "$runtime_dir/REVISION"

previous_target="$(readlink "$current_link" 2>/dev/null || true)"
next_link="$runtime_dir/.current-$revision"
unlink "$next_link" 2>/dev/null || true
ln -s "releases/$revision" "$next_link"
mv -Tf "$next_link" "$current_link"

printf '切换 PM2 到 %s…\n' "$short_revision"
if ! pm2 startOrReload "$runtime_dir/ecosystem.config.cjs" --env production --update-env; then
  if [[ -n "$previous_target" ]]; then
    rollback_link="$runtime_dir/.current-rollback"
    unlink "$rollback_link" 2>/dev/null || true
    ln -s "$previous_target" "$rollback_link"
    mv -Tf "$rollback_link" "$current_link"
    pm2 startOrReload "$runtime_dir/ecosystem.config.cjs" --env production --update-env || true
  fi
  fail "PM2 切换失败，已尝试恢复上一版本"
fi
pm2 save

readonly releases_real="$(realpath "$releases_dir")"
while IFS= read -r -d '' old_release; do
  [[ "$old_release" == "$new_release" ]] && continue
  [[ "$(dirname -- "$(realpath "$old_release")")" == "$releases_real" ]] || fail "拒绝删除越界目录：$old_release"
  rm -rf -- "$old_release"
done < <(find "$releases_dir" -mindepth 1 -maxdepth 1 -type d -print0)

printf '部署完成：%s；临时源码、node_modules、.git 与旧产物将在退出时清理。\n' "$short_revision"
du -sh "$runtime_dir"
pm2 status moyu
