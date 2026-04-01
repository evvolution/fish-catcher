-- CreateTable
CREATE TABLE `moment_activities` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `icon_key` VARCHAR(64) NOT NULL,
    `description` VARCHAR(255) NULL,
    `prompt` VARCHAR(255) NULL,
    `color_start` VARCHAR(16) NULL,
    `color_end` VARCHAR(16) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `moment_activities_slug_key`(`slug`),
    INDEX `idx_moment_activities_sort_active`(`sort_order`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dimension_groups` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `label` VARCHAR(64) NOT NULL,
    `description` VARCHAR(255) NULL,
    `kind` ENUM('TIME_OF_DAY', 'INDUSTRY', 'MOOD', 'STYLE', 'SOLAR_TERM', 'HOLIDAY', 'WEATHER', 'CARD_RARITY', 'GREETING_PHASE') NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dimension_groups_key_key`(`key`),
    INDEX `idx_dimension_groups_kind_sort`(`kind`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dimension_options` (
    `id` VARCHAR(191) NOT NULL,
    `group_id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `label` VARCHAR(64) NOT NULL,
    `description` VARCHAR(255) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_dimension_options_group_sort_active`(`group_id`, `sort_order`, `is_active`),
    UNIQUE INDEX `uniq_dimension_options_group_slug`(`group_id`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `copywriting_entries` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `kind` ENUM('RESULT', 'CARD', 'GREETING', 'GUIDE') NOT NULL,
    `activity_id` VARCHAR(191) NULL,
    `title` VARCHAR(120) NOT NULL,
    `content` TEXT NOT NULL,
    `notes` VARCHAR(255) NULL,
    `min_duration_sec` INTEGER NULL,
    `max_duration_sec` INTEGER NULL,
    `weight` INTEGER NOT NULL DEFAULT 100,
    `drop_rate` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `copywriting_entries_slug_key`(`slug`),
    INDEX `idx_copywriting_entries_kind_active`(`kind`, `is_active`),
    INDEX `idx_copywriting_entries_activity_kind`(`activity_id`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `copywriting_entry_dimensions` (
    `copywriting_entry_id` VARCHAR(191) NOT NULL,
    `option_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_copywriting_entry_dimensions_option`(`option_id`),
    PRIMARY KEY (`copywriting_entry_id`, `option_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `background_assets` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `image_path` VARCHAR(255) NOT NULL,
    `source_name` VARCHAR(64) NOT NULL,
    `source_page_url` VARCHAR(255) NOT NULL,
    `photographer_name` VARCHAR(120) NULL,
    `license_label` VARCHAR(120) NULL,
    `blur_color` VARCHAR(16) NULL,
    `description` VARCHAR(255) NULL,
    `activity_id` VARCHAR(191) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `background_assets_slug_key`(`slug`),
    INDEX `idx_background_assets_activity_sort_active`(`activity_id`, `sort_order`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `background_asset_dimensions` (
    `background_asset_id` VARCHAR(191) NOT NULL,
    `option_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_background_asset_dimensions_option`(`option_id`),
    PRIMARY KEY (`background_asset_id`, `option_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `city_guides` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `description` VARCHAR(255) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `city_guides_slug_key`(`slug`),
    INDEX `idx_city_guides_sort_active`(`sort_order`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `city_snacks` (
    `id` VARCHAR(191) NOT NULL,
    `city_id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(64) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `unit_label` VARCHAR(16) NOT NULL DEFAULT '份',
    `price_cents` INTEGER NOT NULL,
    `description` VARCHAR(255) NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_city_snacks_city_sort_active`(`city_id`, `sort_order`, `is_active`),
    UNIQUE INDEX `uniq_city_snacks_city_slug`(`city_id`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dimension_options` ADD CONSTRAINT `dimension_options_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `dimension_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `copywriting_entries` ADD CONSTRAINT `copywriting_entries_activity_id_fkey` FOREIGN KEY (`activity_id`) REFERENCES `moment_activities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `copywriting_entry_dimensions` ADD CONSTRAINT `copywriting_entry_dimensions_copywriting_entry_id_fkey` FOREIGN KEY (`copywriting_entry_id`) REFERENCES `copywriting_entries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `copywriting_entry_dimensions` ADD CONSTRAINT `copywriting_entry_dimensions_option_id_fkey` FOREIGN KEY (`option_id`) REFERENCES `dimension_options`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `background_assets` ADD CONSTRAINT `background_assets_activity_id_fkey` FOREIGN KEY (`activity_id`) REFERENCES `moment_activities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `background_asset_dimensions` ADD CONSTRAINT `background_asset_dimensions_background_asset_id_fkey` FOREIGN KEY (`background_asset_id`) REFERENCES `background_assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `background_asset_dimensions` ADD CONSTRAINT `background_asset_dimensions_option_id_fkey` FOREIGN KEY (`option_id`) REFERENCES `dimension_options`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `city_snacks` ADD CONSTRAINT `city_snacks_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `city_guides`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
