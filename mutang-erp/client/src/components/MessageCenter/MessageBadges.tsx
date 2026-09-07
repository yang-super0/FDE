import React from 'react';

import {
  MESSAGE_STATUS_READ,
  PRIORITY_HIGH,
  PRIORITY_LOW,
  PUSH_STATUS_FAILED,
  PUSH_STATUS_PENDING,
  PUSH_STATUS_PUSHED,
  getMessageStatusLabel,
  getMessageTypeLabel,
  getPriorityLabel,
  getPushStatusLabel,
} from './constants';

const BADGE_BASE =
  'inline-flex items-center rounded-none border px-1.5 py-0.5 text-[11px] font-semibold leading-none whitespace-nowrap';

export const MsgTypeBadge: React.FC<{ msgType: string }> = ({ msgType }) => (
  <span
    className={`${BADGE_BASE} border-border bg-accent text-muted-foreground`}
  >
    {getMessageTypeLabel(msgType)}
  </span>
);

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const isRead = status === MESSAGE_STATUS_READ;
  return (
    <span
      className={
        isRead
          ? `${BADGE_BASE} border-border bg-muted text-muted-foreground`
          : `${BADGE_BASE} border-primary bg-primary text-primary-foreground`
      }
    >
      {getMessageStatusLabel(status)}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  let cls = `${BADGE_BASE} border-border bg-muted text-muted-foreground`;
  if (priority === PRIORITY_HIGH) {
    cls = `${BADGE_BASE} border-transparent bg-destructive/10 text-destructive`;
  } else if (priority === PRIORITY_LOW) {
    cls = `${BADGE_BASE} border-border bg-accent text-muted-foreground`;
  }
  return <span className={cls}>{getPriorityLabel(priority)}</span>;
};

export const PushStatusBadge: React.FC<{ pushStatus: string }> = ({
  pushStatus,
}) => {
  let cls = `${BADGE_BASE} border-border bg-muted text-muted-foreground`;
  let label = getPushStatusLabel(pushStatus);
  if (pushStatus === PUSH_STATUS_PUSHED) {
    cls = `${BADGE_BASE} border-transparent bg-success-foreground text-success`;
  } else if (pushStatus === PUSH_STATUS_FAILED) {
    cls = `${BADGE_BASE} border-transparent bg-destructive/10 text-destructive`;
  } else if (pushStatus === PUSH_STATUS_PENDING) {
    cls = `${BADGE_BASE} border-transparent bg-warning-foreground text-warning`;
  } else {
    label = pushStatus;
  }
  return <span className={cls}>{label}</span>;
};
