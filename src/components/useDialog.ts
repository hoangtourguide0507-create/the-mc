import { useEffect, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

interface DialogOptions {
  /** Bấm vào nền mờ để đóng. Mặc định bật. */
  backdropDismiss?: boolean;
}

/**
 * Hành vi chung cho hộp thoại (sheet/modal):
 * - Esc gọi onClose
 * - bấm nền mờ gọi onClose (nếu backdropDismiss)
 * - gắn role="dialog", aria-modal, aria-label cho phần thân hộp thoại
 * - chuyển focus vào hộp thoại khi mở, trả lại focus cho phần tử trước đó khi đóng
 *
 * Phải gọi trước mọi câu lệnh return sớm trong component.
 */
export function useDialog(
  open: boolean,
  onClose: () => void,
  label: string,
  options: DialogOptions = {}
) {
  const { backdropDismiss = true } = options;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const returnFocus = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      returnFocus?.focus?.({ preventScroll: true });
    };
  }, [open]);

  return {
    backdropProps: backdropDismiss
      ? {
          onMouseDown: (e: ReactMouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) closeRef.current();
          },
        }
      : {},
    panelProps: {
      ref: panelRef,
      role: 'dialog' as const,
      'aria-modal': true as const,
      'aria-label': label,
      tabIndex: -1,
    },
  };
}
