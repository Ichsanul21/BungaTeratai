import type { ThemeConfig } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

// Palet resmi: putih, navy #00205B, merah #BA0C2F, ink #111827, kanvas #F5F7FA.
export const BT_WHITE = '#FFFFFF';
export const BT_NAVY = '#00205B';
export const BT_PRIMARY = '#BA0C2F';
export const BT_PRIMARY_HOVER = '#8E0924';
export const BT_INK = '#111827';
export const BT_MUTED = '#5B6474';
export const BT_APPBG = '#F5F7FA';
export const BT_HAIRLINE = '#E3E8F0';
export const BT_SOFT_PRIMARY = 'rgba(186,12,47,0.10)';
export const BT_NAVY_TINT = '#E8EDF7';
export const BT_OK = '#15803D';
export const BT_WARN = '#B45309';
export const BT_DANGER = '#BA0C2F';
export const BT_INFO = '#00205B';

const theme: ThemeConfig = {
    token: {
        colorPrimary: BT_PRIMARY,
        colorSuccess: BT_OK,
        colorWarning: BT_WARN,
        colorError: BT_DANGER,
        colorInfo: BT_INFO,
        colorBgLayout: BT_APPBG,
        colorBgContainer: BT_WHITE,
        colorBorder: BT_HAIRLINE,
        colorBorderSecondary: BT_HAIRLINE,
        colorText: BT_INK,
        colorTextSecondary: BT_MUTED,
        colorTextTertiary: BT_MUTED,
        colorTextQuaternary: '#5B647480',
        borderRadius: 10,
        borderRadiusLG: 16,
        borderRadiusSM: 8,
        fontFamily: "'Archivo', ui-sans-serif, system-ui, sans-serif",
        fontFamilyCode: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        colorLink: BT_PRIMARY,
        colorLinkHover: BT_PRIMARY_HOVER,
        colorLinkActive: BT_PRIMARY_HOVER,
        controlHeight: 40,
        controlHeightLG: 44,
        controlHeightSM: 32,
        boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 10px 30px -18px rgba(17,24,39,0.18)',
        boxShadowSecondary: '0 1px 2px rgba(17,24,39,0.03), 0 6px 16px -10px rgba(17,24,39,0.12)',
    },
    components: {
        Button: {
            controlHeight: 40,
            controlHeightLG: 44,
            controlHeightSM: 32,
            borderRadius: 10,
            primaryShadow: '0 6px 18px -8px rgba(186,12,47,0.45)',
        },
        Card: {
            borderRadiusLG: 20,
            headerFontSize: 14,
            paddingLG: 20,
        },
        Table: {
            borderRadius: 16,
            headerBg: '#F5F7FA',
            headerColor: BT_MUTED,
            headerSplitColor: 'transparent',
            rowHoverBg: '#F5F7FA',
            borderColor: BT_HAIRLINE,
            cellPaddingBlock: 12,
            cellPaddingInline: 16,
        },
        Input: {
            controlHeight: 40,
            controlHeightLG: 44,
            borderRadius: 10,
            activeBorderColor: BT_PRIMARY,
            hoverBorderColor: '#11182766',
            activeShadow: '0 0 0 3px rgba(186,12,47,0.10)',
        },
        Select: {
            controlHeight: 40,
            controlHeightLG: 44,
            borderRadius: 10,
            optionSelectedBg: '#FBEAEE',
            optionSelectedColor: BT_PRIMARY,
        },
        Menu: {
            itemBg: 'transparent',
            subMenuItemBg: 'transparent',
            itemColor: 'rgba(17,24,39,0.65)',
            itemHoverColor: BT_INK,
            itemHoverBg: '#F5F7FA',
            itemSelectedBg: BT_SOFT_PRIMARY,
            itemSelectedColor: BT_PRIMARY,
            itemActiveBg: BT_SOFT_PRIMARY,
            iconSize: 18,
            collapsedIconSize: 18,
            itemBorderRadius: 10,
            itemMarginInline: 8,
            itemPaddingInline: 12,
        },
        Tabs: {
            itemSelectedColor: BT_PRIMARY,
            itemHoverColor: BT_PRIMARY_HOVER,
            itemActiveColor: BT_PRIMARY,
            inkBarColor: BT_PRIMARY,
            titleFontSize: 14,
            cardBg: '#F5F7FA',
            cardGutter: 6,
        },
        Tag: {
            borderRadiusSM: 9999,
        },
        Modal: {
            borderRadiusLG: 20,
            titleFontSize: 18,
        },
        Drawer: {
            paddingLG: 24,
        },
        Statistic: {
            titleFontSize: 12,
            contentFontSize: 28,
        },
        Badge: {
            dotSize: 8,
        },
        Form: {
            labelColor: BT_INK,
            labelFontSize: 14,
            itemMarginBottom: 16,
        },
        Tooltip: {
            borderRadius: 10,
            colorBgSpotlight: BT_INK,
        },
        Pagination: {
            itemActiveBg: BT_PRIMARY,
            colorPrimary: '#FFFFFF',
            colorPrimaryHover: '#FFFFFF',
        },
    },
};

// Tema rail sidebar (putih bersih, aksen merah lembut).
export const sidebarTheme: ThemeConfig = {
    ...theme,
    token: {
        ...theme.token!,
        colorBgContainer: BT_WHITE,
        colorBgElevated: BT_WHITE,
        colorBorder: BT_HAIRLINE,
        colorBorderSecondary: BT_HAIRLINE,
    },
    components: {
        ...theme.components!,
        Menu: {
            ...theme.components!.Menu!,
            itemColor: 'rgba(17,24,39,0.65)',
            itemHoverColor: BT_INK,
            itemHoverBg: '#F5F7FA',
            itemSelectedBg: BT_SOFT_PRIMARY,
            itemSelectedColor: BT_PRIMARY,
            itemActiveBg: BT_SOFT_PRIMARY,
        },
    },
};

export default theme;
