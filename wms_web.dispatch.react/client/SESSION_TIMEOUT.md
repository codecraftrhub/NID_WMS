# Session Timeout Implementation

This document describes the session timeout functionality implemented in the React WMS application.

## Overview

The application now includes automatic session timeout functionality that logs out users after 30 minutes of inactivity. Before logging out, users are shown a warning modal with a 30-second countdown, giving them the option to continue their session or log out immediately.

## Components

### 1. useSessionTimeout Hook (`/src/hooks/useSessionTimeout.ts`)

A custom React hook that manages session timeout functionality:

- **Timeout Duration**: 30 minutes (configurable)
- **Warning Duration**: 30 seconds before logout (configurable)
- **Activity Detection**: Monitors mouse, keyboard, touch, and scroll events
- **Automatic Reset**: Resets timer on any user activity

#### Usage:
```typescript
const { extendSession } = useSessionTimeout({
  timeout: 30 * 60 * 1000, // 30 minutes
  onTimeout: handleLogout,
  onWarning: handleWarning,
  warningTime: 30 * 1000, // 30 seconds
  isAuthenticated: true
});
```

### 2. SessionTimeoutModal Component (`/src/components/SessionTimeoutModal.tsx`)

A modal component that displays the session timeout warning:

- **Countdown Timer**: Shows remaining time in seconds
- **Action Buttons**: "Continue Session" and "Logout Now"
- **Auto-logout**: Automatically logs out when countdown reaches zero
- **Non-dismissible**: Cannot be closed by clicking outside or pressing escape

#### Features:
- Visual countdown display with clock icon
- Warning styling with yellow/amber colors
- Responsive design
- Accessibility support

### 3. SessionManager Component (`/src/components/SessionManager.tsx`)

A wrapper component that orchestrates the session timeout functionality:

- **Integration Point**: Wraps the entire application
- **State Management**: Manages warning modal visibility
- **Event Coordination**: Connects timeout hook with modal and auth context

## Integration

The session timeout is integrated into the main application through the `App.tsx` file:

```typescript
<AuthProvider>
  <SessionManager>
    <Router>
      {/* Application routes */}
    </Router>
  </SessionManager>
</AuthProvider>
```

## Configuration

### Timeout Values (in SessionManager.tsx):
- **SESSION_TIMEOUT**: 30 minutes (1,800,000 milliseconds)
- **WARNING_TIME**: 30 seconds (30,000 milliseconds)

### Monitored Activities:
- Mouse movement and clicks
- Keyboard input
- Touch events
- Page scrolling

## Security Features

1. **Automatic Cleanup**: Timers are automatically cleared when user logs out
2. **Authentication Guard**: Only starts timers for authenticated users
3. **Activity Reset**: Any user activity resets the timeout period
4. **Forced Logout**: Cannot bypass the timeout mechanism

## Testing

A test suite is included in `/src/components/__tests__/SessionTimeout.test.tsx` that verifies:
- Warning triggers at correct time
- Timeout occurs after specified duration
- No timers start for unauthenticated users

## User Experience

1. **Normal Usage**: Users work normally, timeout resets on activity
2. **Warning Phase**: After 29.5 minutes of inactivity, warning modal appears
3. **Decision Time**: User has 30 seconds to choose "Continue" or "Logout"
4. **Auto-logout**: If no action taken, user is automatically logged out
5. **Continue Session**: Clicking "Continue" dismisses modal and resets timer

## Browser Compatibility

The implementation uses:
- Standard DOM events (compatible with all modern browsers)
- React hooks (React 16.8+)
- setTimeout/clearTimeout (universal browser support)

## Performance Considerations

- **Efficient Event Handling**: Uses passive event listeners
- **Memory Management**: Properly cleans up timers and event listeners
- **Minimal Re-renders**: Optimized with useCallback hooks
- **Activity Debouncing**: Built-in debouncing through timer resets

## Future Enhancements

Potential improvements that could be added:

1. **Configurable Timeouts**: Allow different timeout values per user role
2. **Server-side Validation**: Validate session on server before extending
3. **Activity Logging**: Log user activity patterns for analytics
4. **Multiple Warnings**: Show multiple warnings at different intervals
5. **Background Sync**: Sync session state across multiple tabs