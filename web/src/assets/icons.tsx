import type { ReactNode } from 'react';
import {
  ArrowLeftOutlined, ArrowRightOutlined,
  BgColorsOutlined, CheckOutlined, CloseOutlined,
  CodeOutlined, ControlOutlined, CopyOutlined,
  DeleteOutlined, DisconnectOutlined, DownOutlined,
  EditOutlined, FontSizeOutlined,
  GlobalOutlined, InfoCircleOutlined, KeyOutlined,
  LinkOutlined, MessageOutlined, MobileOutlined,
  MoonOutlined, NumberOutlined, PictureOutlined,
  PlusOutlined, ReloadOutlined, SendOutlined,
  SunOutlined, TagOutlined,
  TeamOutlined, ThunderboltOutlined, UndoOutlined,
} from '@ant-design/icons';

const ICON_MAP = {
  // ── button actions ────────────────────────────────────────────────────────
  check:          CheckOutlined,
  x:              CloseOutlined,
  pencil:         EditOutlined,
  bolt:           ThunderboltOutlined,
  trash:          DeleteOutlined,
  refresh:        ReloadOutlined,
  plus:           PlusOutlined,
  sliders:        ControlOutlined,
  link:           LinkOutlined,
  unlink:         DisconnectOutlined,
  send:           SendOutlined,
  copy:           CopyOutlined,
  undo:           UndoOutlined,
  'arrow-left':   ArrowLeftOutlined,
  'arrow-right':  ArrowRightOutlined,
  // ── ui chrome ─────────────────────────────────────────────────────────────
  sun:            SunOutlined,
  moon:           MoonOutlined,
  'chevron-down': DownOutlined,
  // ── input field context ───────────────────────────────────────────────────
  tag:            TagOutlined,
  hash:           NumberOutlined,
  phone:          MobileOutlined,
  key:            KeyOutlined,
  text:           FontSizeOutlined,
  chat:           MessageOutlined,
  swatch:         BgColorsOutlined,
  photo:          PictureOutlined,
  code:           CodeOutlined,
  globe:          GlobalOutlined,
  users:          TeamOutlined,
  info:           InfoCircleOutlined,
} as const;

export function Ic({
  name,
  className = 'text-xs shrink-0',
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICON_MAP[name as keyof typeof ICON_MAP];
  if (!Icon) return null;
  return <Icon className={className} />;
}

export function InputWrap({
  icon,
  children,
  compact = false,
  topAlign = false,
}: {
  icon: string;
  children: ReactNode;
  compact?: boolean;
  topAlign?: boolean;
}) {
  return (
    <div className="relative">
      <span className={`pointer-events-none absolute left-3 text-tx-muted ${
        compact ? 'top-1.5' : topAlign ? 'top-3' : 'top-1/2 -translate-y-1/2'
      }`}>
        <Ic name={icon} className={compact ? 'text-sm shrink-0' : 'text-base shrink-0'} />
      </span>
      {children}
    </div>
  );
}
