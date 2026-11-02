import type { ThemeConfig } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

const theme: ThemeConfig = {
    token: {
        colorPrimary: '#C1121F',
        colorSuccess: '#2F8F68',
        colorWarning: '#D99A2B',
        colorError: '#C94C4C',
        colorInfo: '#1E4668',
        colorBgLayout: '#FAF7F2',
        colorBorder: '#E7E1D9',
        colorBorderSecondary: '#E7E1D9',
        colorText: '#1C1B1A',
        colorTextSecondary: '#8A8580',
        colorTextTertiary: '#8A8580',
        colorTextQuaternary: '#8A858080',
        borderRadius: 8,
        borderRadiusLG: 12,
        borderRadiusSM: 6,
        fontFamily: "'Archivo', ui-sans-serif, system-ui, sans-serif",
        fontFamilyCode: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        colorLink: '#C1121F',
        colorLinkHover: '#780000',
        colorLinkActive: '#780000',
        controlHeight: 40,
        controlHeightLG: 44,
        controlHeightSM: 32,
        boxShadow: '0 1px 3px rgba(28,27,26,0.06), 0 8px 24px -8px rgba(28,27,26,0.12)',
        boxShadowSecondary: '0 1px 2px rgba(28,27,26,0.04), 0 4px 12px -4px rgba(28,27,26,0.08)',
    },
    components: {
        Button: {
            controlHeight: 40,
            controlHeightLG: 44,
            controlHeightSM: 32,
            borderRadius: 8,
            primaryShadow: '0 4px 14px -4px rgba(193,18,31,0.35)',
        },
        Card: {
            borderRadiusLG: 12,
            headerFontSize: 14,
            paddingLG: 20,
        },
        Table: {
            borderRadius: 12,
            headerBg: '#FAF7F2',
            headerColor: '#8A8580',
            headerSplitColor: 'transparent',
            rowHoverBg: '#FAF7F2',
            borderColor: '#E7E1D9',
            cellPaddingBlock: 12,
            cellPaddingInline: 16,
        },
        Input: {
            controlHeight: 40,
            controlHeightLG: 44,
            borderRadius: 8,
            activeBorderColor: '#C1121F',
            hoverBorderColor: '#1C1B1A66',
            activeShadow: '0 0 0 3px rgba(193,18,31,0.1)',
        },
        Select: {
            controlHeight: 40,
            controlHeightLG: 44,
            borderRadius: 8,
            optionSelectedBg: '#FDECEA',
            optionSelectedColor: '#C1121F',
        },
        Menu: {
            itemBg: 'transparent',
            subMenuItemBg: 'transparent',
            itemColor: 'rgba(239,227,211,0.6)',
            itemHoverColor: '#EFE3D3',
            itemSelectedBg: 'rgba(212,169,106,0.12)',
            itemSelectedColor: '#EFE3D3',
            itemActiveBg: 'rgba(212,169,106,0.16)',
            iconSize: 18,
            collapsedIconSize: 18,
            itemBorderRadius: 8,
            itemMarginInline: 8,
            itemPaddingInline: 12,
        },
        Tabs: {
            itemSelectedColor: '#C1121F',
            itemHoverColor: '#780000',
            itemActiveColor: '#C1121F',
            inkBarColor: '#C1121F',
            titleFontSize: 14,
        },
        Tag: {
            borderRadiusSM: 9999,
        },
        Modal: {
            borderRadiusLG: 16,
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
            labelColor: '#1C1B1A',
            labelFontSize: 14,
            itemMarginBottom: 16,
        },
        Tooltip: {
            borderRadius: 8,
            colorBgSpotlight: '#1C1B1A',
        },
        Pagination: {
            itemActiveBg: '#C1121F',
            colorPrimary: '#FFFFFF',
            colorPrimaryHover: '#FFFFFF',
        },
    },
};

export const sidebarTheme: ThemeConfig = {
    ...theme,
    token: {
        ...theme.token!,
        colorBgContainer: '#451016',
        colorBgElevated: '#451016',
        colorBorder: 'rgba(239,227,211,0.08)',
        colorBorderSecondary: 'rgba(239,227,211,0.06)',
    },
    components: {
        ...theme.components!,
        Menu: {
            ...theme.components!.Menu!,
            darkItemBg: '#451016',
            darkSubMenuItemBg: '#451016',
            darkItemColor: 'rgba(239,227,211,0.6)',
            darkItemHoverColor: '#EFE3D3',
            darkItemHoverBg: 'rgba(255,255,255,0.05)',
            darkItemSelectedBg: 'linear-gradient(90deg, rgba(212,169,106,0.16), rgba(212,169,106,0.03), transparent)',
            darkItemSelectedColor: '#EFE3D3',
        },
    },
};

export const BT_PRIMARY = '#C1121F';
export const BT_PRIMARY_HOVER = '#780000';
export const BT_GOLD = '#D4A96A';
export const BT_CREAM = '#EFE3D3';
export const BT_SIDEBAR = '#FFFFFF';
export const BT_APPBG = '#FAF7F2';
export const BT_HAIRLINE = '#E7E1D9';
export const BT_INK = '#1C1B1A';
export const BT_MUTED = '#8A8580';
export const BT_OK = '#2F8F68';
export const BT_WARN = '#D99A2B';
export const BT_DANGER = '#C94C4C';
export const BT_MARITIME = '#1E4668';

export default theme;
