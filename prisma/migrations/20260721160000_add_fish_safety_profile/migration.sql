ALTER TABLE `fish_species`
    ADD COLUMN `china_protection_status` VARCHAR(40) NOT NULL DEFAULT 'NONE',
    ADD COLUMN `china_protection_note` VARCHAR(500) NULL,
    ADD COLUMN `china_protection_basis` VARCHAR(191) NULL,
    ADD COLUMN `china_protection_source_url` VARCHAR(500) NULL,
    ADD COLUMN `cites_appendix` VARCHAR(8) NOT NULL DEFAULT 'NONE',
    ADD COLUMN `cites_note` VARCHAR(500) NULL,
    ADD COLUMN `cites_source_url` VARCHAR(500) NULL,
    ADD COLUMN `three_have_status` VARCHAR(24) NOT NULL DEFAULT 'NOT_APPLICABLE',
    ADD COLUMN `three_have_note` VARCHAR(300) NULL,
    ADD COLUMN `toxicity_status` VARCHAR(32) NOT NULL DEFAULT 'NONE_KNOWN',
    ADD COLUMN `toxicity_note` VARCHAR(500) NULL,
    ADD COLUMN `edibility_status` VARCHAR(32) NOT NULL DEFAULT 'NOT_RECOMMENDED',
    ADD COLUMN `edibility_note` VARCHAR(500) NULL,
    ADD COLUMN `legal_reviewed_at` VARCHAR(10) NULL;

UPDATE `fish_species`
SET
    `china_protection_note` = '',
    `china_protection_basis` = '',
    `china_protection_source_url` = '',
    `cites_note` = '',
    `cites_source_url` = '',
    `three_have_note` = '',
    `toxicity_note` = '',
    `edibility_note` = '',
    `legal_reviewed_at` = '';

ALTER TABLE `fish_species`
    MODIFY `china_protection_note` VARCHAR(500) NOT NULL,
    MODIFY `china_protection_basis` VARCHAR(191) NOT NULL,
    MODIFY `china_protection_source_url` VARCHAR(500) NOT NULL,
    MODIFY `cites_note` VARCHAR(500) NOT NULL,
    MODIFY `cites_source_url` VARCHAR(500) NOT NULL,
    MODIFY `three_have_note` VARCHAR(300) NOT NULL,
    MODIFY `toxicity_note` VARCHAR(500) NOT NULL,
    MODIFY `edibility_note` VARCHAR(500) NOT NULL,
    MODIFY `legal_reviewed_at` VARCHAR(10) NOT NULL;
