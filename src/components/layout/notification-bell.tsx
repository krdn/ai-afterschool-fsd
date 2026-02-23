"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getAllNotifications,
  type Notification,
} from "@/lib/actions/common/notifications";
import { handleStaleDeploymentError } from "@/lib/errors/stale-deployment";

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAllNotifications();
      if (result.success) {
        // dismissedIds에 없는 알림만 표시
        const activeNotifications = result.data.filter(
          (n) => !dismissedIds.has(n.id)
        );
        setNotifications(activeNotifications);
      } else {
        setError(result.error ?? "알림을 불러오는 중 오류가 발생했습니다.");
      }
    } catch (err) {
      if (handleStaleDeploymentError(err)) return;
      setError("알림을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [dismissedIds]);

  // 컴포넌트 마운트 시 및 주기적으로 알림 조회
  useEffect(() => {
    fetchNotifications();

    // 5분마다 알림 갱신
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-notification-container]")) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getSeverityIcon = (severity: Notification["severity"]) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBgColor = (severity: Notification["severity"]) => {
    switch (severity) {
      case "error":
        return "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800";
      case "warning":
        return "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800";
      case "info":
        return "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800";
    }
  };

  return (
    <div className={`relative ${className || ""}`} data-notification-container>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`알림 ${unreadCount > 0 ? `(${unreadCount}개)` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card rounded-lg border shadow-lg z-50">
          <div className="p-3 border-b flex items-center justify-between">
            <h3 className="font-semibold">알림</h3>
            <span className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount}개의 알림` : "새 알림 없음"}
            </span>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <div className="animate-pulse">알림을 불러오는 중...</div>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">
                <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm">{error}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">새 알림이 없습니다</p>
              </div>
            ) : (
              <ul className="divide-y">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`p-3 hover:bg-muted/50 transition-colors ${
                      notification.read ? "opacity-70" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getSeverityIcon(notification.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm truncate">
                            {notification.title}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 -mt-1 -mr-1 flex-shrink-0 hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismiss(notification.id);
                            }}
                            aria-label="알림 닫기"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {notification.message}
                        </p>
                        {notification.type === "budget_alert" &&
                          notification.metadata && (
                            <div
                              className={`mt-2 p-2 rounded text-xs border ${getSeverityBgColor(
                                notification.severity
                              )}`}
                            >
                              <div className="flex justify-between">
                                <span>현재 사용량:</span>
                                <span className="font-medium">
                                  $
                                  {(
                                    notification.metadata as {
                                      currentCost: number;
                                    }
                                  ).currentCost.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between mt-1">
                                <span>예산:</span>
                                <span className="font-medium">
                                  $
                                  {(
                                    notification.metadata as { budget: number }
                                  ).budget.toFixed(2)}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    notification.severity === "error"
                                      ? "bg-red-500"
                                      : "bg-amber-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (
                                        notification.metadata as {
                                          percentUsed: number;
                                        }
                                      ).percentUsed
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => {
                  setDismissedIds(
                    new Set(notifications.map((n) => n.id))
                  );
                  setNotifications([]);
                }}
              >
                모든 알림 지우기
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  return new Date(date).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}
