import { type PageProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const TZ = 'Asia/Makassar';
const ROWS = 13;
const TILES = 8;

function timestampLabel(ms: number): string {
    if (!Number.isFinite(ms)) {
        return '-';
    }

    const formatted = new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: TZ,
    }).format(new Date(ms));

    return `${formatted.replace(/\./g, ':')} WITA`;
}

/**
 * Watermark keamanan: pita diagonal berjalan seperti rangkaian kereta
 * (translateX -50% dengan konten diduplikasi -> sambungan tak terlihat).
 *
 * Muncul di semua halaman. Baris kedua memuat identitas pengunjung
 * (IP, perangkat, waktu, pengguna) supaya screenshot dapat dilacak.
 */
export default function SecurityWatermark() {
    const { watermark, auth } = usePage<PageProps>().props;
    const isGuest = !auth?.user;

    const receivedAt = useRef<number>(Date.now());
    const base = useMemo(
        () => (watermark ? new Date(watermark.server_time).getTime() : Date.now()),
        [watermark?.server_time],
    );
    const [now, setNow] = useState<number>(base);

    useEffect(() => {
        receivedAt.current = Date.now();
        setNow(base);
    }, [base]);

    useEffect(() => {
        const id = window.setInterval(() => {
            setNow(base + (Date.now() - receivedAt.current));
        }, 1000);

        return () => window.clearInterval(id);
    }, [base]);

    if (!watermark || !watermark.values || (isGuest && !watermark.show_login)) {
        return null;
    }

    const resolve = (template: string): string => {
        const values: Record<string, string> = {
            '{ip}': watermark.values.ip,
            '{device}': watermark.values.device,
            '{user}': watermark.values.user,
            '{company}': watermark.values.company,
            '{doc_no}': watermark.values.doc_no ?? '',
            '{timestamp}': timestampLabel(now),
        };

        return Object.entries(values).reduce(
            (text, [token, value]) => text.split(token).join(value),
            template,
        );
    };

    const line1 = resolve(watermark.line1);
    const line2 = resolve(watermark.line2);
    const speed = Math.max(10, watermark.speed);
    const rows = Array.from({ length: ROWS }, (_, index) => index);
    const tiles = Array.from({ length: TILES }, (_, index) => index);

    return (
        <div
            aria-hidden="true"
            className="bt-wm"
            style={{
                opacity: watermark.opacity,
                color: watermark.color,
                fontSize: `${watermark.font_size}px`,
            }}
        >
            <style>{`
                .bt-wm {
                    position: fixed; inset: 0; overflow: hidden;
                    pointer-events: none; z-index: 9998;
                    user-select: none; -webkit-user-select: none;
                }
                .bt-wm-plane {
                    position: absolute; left: 50%; top: 50%;
                    width: 260vmax; height: 260vmax;
                }
                .bt-wm-row {
                    position: absolute; left: -55vmax;
                    display: flex; width: max-content;
                }
                .bt-wm-track {
                    display: flex; width: max-content;
                    animation-name: bt-wm-slide;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                    will-change: transform;
                }
                .bt-wm-half { display: flex; flex: none; }
                .bt-wm-item {
                    display: inline-flex; flex-direction: column; gap: 2px;
                    margin-right: 72px; white-space: nowrap;
                }
                .bt-wm-l1 {
                    font-family: Archivo, ui-sans-serif, system-ui, sans-serif;
                    font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
                    font-size: 0.94em;
                }
                .bt-wm-l2 {
                    font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, monospace;
                    letter-spacing: 0.02em; font-size: 0.86em;
                }
                @keyframes bt-wm-slide {
                    from { transform: translate3d(0, 0, 0); }
                    to { transform: translate3d(-50%, 0, 0); }
                }
                @media (prefers-reduced-motion: reduce) {
                    /* Tetap bergerak (watermark keamanan), hanya diperlambat. */
                    .bt-wm-track { animation-duration: 160s !important; }
                }
            `}</style>

            <div
                className="bt-wm-plane"
                style={{ transform: `translate(-50%, -50%) rotate(${watermark.angle}deg)` }}
            >
                {rows.map((row) => (
                    <div
                        key={row}
                        className="bt-wm-row"
                        style={{
                            top: `calc(50% + ${(row - (ROWS - 1) / 2) * 120}px)`,
                        }}
                    >
                        <div
                            className="bt-wm-track"
                            style={{
                                animationDuration: `${speed}s`,
                                animationDelay: `${-((row % 5) * speed) / 9}s`,
                            }}
                        >
                            {[0, 1].map((half) => (
                                <div key={half} className="bt-wm-half">
                                    {tiles.map((tile) => (
                                        <span key={tile} className="bt-wm-item">
                                            <span className="bt-wm-l1">{line1}</span>
                                            <span className="bt-wm-l2">{line2}</span>
                                        </span>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
