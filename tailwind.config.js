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
                    DEFAULT: '#BA0C2F', hover: '#8E0924',
                    tint: '#FBEAEE', tintborder: '#F3D2D9',
                },
                navy: '#00205B',
                maritime: '#00205B', oceanteal: '#0B4A8F',
                ink: '#111827', muted: '#5B6474', appbg: '#F5F7FA',
                hairline: '#E3E8F0', warn: '#B45309', ok: '#15803D',
                danger: '#BA0C2F',
                sidebar: '#FFFFFF', sidebarhover: '#F5F7FA',
                cream: '#FFFFFF', gold: '#00205B',
                stone: '#CBD5E1',
            },
            fontFamily: {
                sans: ['Archivo', ...defaultTheme.fontFamily.sans],
                mono: ['IBM Plex Mono', ...defaultTheme.fontFamily.mono],
            },
        },
    },
    plugins: [forms],
};
