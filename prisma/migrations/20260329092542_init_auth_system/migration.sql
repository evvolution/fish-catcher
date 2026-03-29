-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('MEMBER', 'GUEST') NOT NULL DEFAULT 'MEMBER',
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `status` ENUM('ACTIVE', 'SUSPENDED', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    `display_name` VARCHAR(50) NOT NULL DEFAULT '摸鱼用户',
    `avatar_url` VARCHAR(255) NULL,
    `last_login_at` DATETIME(3) NULL,
    `registered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_users_kind_status`(`kind`, `status`),
    INDEX `idx_users_created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `nickname` VARCHAR(50) NULL,
    `bio` VARCHAR(255) NULL,
    `city` VARCHAR(64) NULL,
    `onboarding_completed` BOOLEAN NOT NULL DEFAULT false,
    `preferences` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_profiles_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_identities` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `provider` ENUM('WECHAT', 'GOOGLE', 'PHONE', 'GUEST') NOT NULL,
    `provider_user_id` VARCHAR(191) NOT NULL,
    `provider_union_id` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(32) NULL,
    `status` ENUM('ACTIVE', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `metadata` JSON NULL,
    `last_used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_auth_identities_user_status`(`user_id`, `status`),
    INDEX `idx_auth_identities_provider_last_used`(`provider`, `last_used_at`),
    UNIQUE INDEX `uniq_auth_provider_user`(`provider`, `provider_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `session_token` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'REVOKED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `platform` VARCHAR(32) NOT NULL DEFAULT 'h5',
    `ip_address` VARCHAR(64) NULL,
    `user_agent` VARCHAR(255) NULL,
    `last_seen_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_sessions_session_token_key`(`session_token`),
    INDEX `idx_user_sessions_user_status`(`user_id`, `status`),
    INDEX `idx_user_sessions_expires_at`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `phone_verification_codes` (
    `id` VARCHAR(191) NOT NULL,
    `scene` ENUM('SIGN_IN', 'BIND_PHONE', 'RESET_PASSWORD') NOT NULL,
    `target` VARCHAR(32) NOT NULL,
    `code_hash` VARCHAR(191) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,
    `consumed_at` DATETIME(3) NULL,
    `metadata` JSON NULL,

    INDEX `idx_phone_codes_target_scene`(`target`, `scene`),
    INDEX `idx_phone_codes_expires_at`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_identities` ADD CONSTRAINT `auth_identities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
