import { useId, type ReactNode } from "react";

function Icon({ children, className = "btn__icon" }: { children: ReactNode; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

export function ExpandIcon() {
  return (
    <Icon>
      <path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />
    </Icon>
  );
}

export function DownloadIcon() {
  return (
    <Icon>
      <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
    </Icon>
  );
}

export function EyeIcon() {
  return (
    <Icon>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function EyeOffIcon() {
  return (
    <Icon>
      <path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A16.6 16.6 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </Icon>
  );
}

export function CameraIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3.5" />
    </Icon>
  );
}

export function TrashIcon() {
  return (
    <Icon>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </Icon>
  );
}

export function HeartIcon({ className = "heart-icon" }: { className?: string }) {
  const gradientId = useId();

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="12" y1="4" x2="12" y2="21" gradientUnits="userSpaceOnUse">
          <stop className="heart-icon__grad-top" offset="0" />
          <stop className="heart-icon__grad-bottom" offset="1" />
        </linearGradient>
      </defs>
      <path
        className="heart-icon__shape"
        fill={`url(#${gradientId})`}
        d="M12 18.8l-1.05-.95C6.55 14.55 4 11.85 4 9.05 4 6.35 6.05 4.25 8.65 4.25c1.55 0 3 .75 3.85 1.95.85-1.2 2.3-1.95 3.85-1.95 2.6 0 4.65 2.1 4.65 4.8 0 2.8-2.55 5.5-6.95 8.8L12 18.8z"
      />
    </svg>
  );
}

export function NotFoundMark() {
  return (
    <div className="mark-badge" aria-hidden="true">
      <span className="mark-badge__code">404</span>
    </div>
  );
}
