import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#C1121F', hover: '#780000',
                    tint: '#FDECEA', tintborder: '#F2D4D0',
                },
                maritime: '#1E4668', oceanteal: '#168C8C',
                ink: '#1C1B1A', muted: '#8A8580', appbg: '#FAF7F2',
                hairline: '#E7E1D9', warn: '#D99A2B', ok: '#2F8F68',
                danger: '#C94C4C',
                sidebar: '#451016', sidebarhover: '#5B1A26',
                cream: '#EFE3D3', gold: '#D4A96A',
                // Token baru untuk dashboard: netral hangat lembut,
                // dipakai palet visualisasi (status dokumen "archived").
                stone: '#C9C0B2',
            },
            fontFamily: {
                sans: ['Archivo', ...defaultTheme.fontFamily.sans],
                mono: ['IBM Plex Mono', ...defaultTheme.fontFamily.mono],
            },
        },
    },
    plugins: [forms],
};