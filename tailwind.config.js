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
                    DEFAULT: '#C41212',
                    hover: '#A30E0E',
                    tint: '#FDF3F3',
                    tintborder: '#F5DCDC',
                },
                maritime: '#1E4668',
                oceanteal: '#168C8C',
                ink: '#172B3A',
                muted: '#64748B',
                appbg: '#F4F7FA',
                hairline: '#DFE6ED',
                warn: '#D99A2B',
                ok: '#2F8F68',
                danger: '#C94C4C',
                sidebar: '#172B3A',
                sidebarhover: '#1F3A4F',
            },
            fontFamily: {
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
            },
        },
    },

    plugins: [forms],
};
