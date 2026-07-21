UPDATE `background_assets`
SET `image_path` = CASE `image_path`
    WHEN '/assets/backgrounds/mist-lake-dawn.jpg' THEN '/assets/backgrounds/mist-lake-dawn.webp'
    WHEN '/assets/backgrounds/forest-light-path.jpg' THEN '/assets/backgrounds/forest-light-path.webp'
    WHEN '/assets/backgrounds/mountain-dusk.jpg' THEN '/assets/backgrounds/mountain-dusk.webp'
    WHEN '/assets/backgrounds/tea-window-night.jpg' THEN '/assets/backgrounds/tea-window-night.webp'
    ELSE `image_path`
END
WHERE `image_path` IN (
    '/assets/backgrounds/mist-lake-dawn.jpg',
    '/assets/backgrounds/forest-light-path.jpg',
    '/assets/backgrounds/mountain-dusk.jpg',
    '/assets/backgrounds/tea-window-night.jpg'
);
