/**
 * ScheduleService.gs - 일정 관리 및 알림 시스템
 * Feature: Step 3 High Priority Features - Week 3-4
 *
 * APIs:
 * - createCalendarEvent(sessionId, eventData) - 일정 생성
 * - listCalendarEvents(sessionId, params) - 일정 목록
 * - updateCalendarEvent(sessionId, eventId, eventData) - 일정 수정
 * - deleteCalendarEvent(sessionId, eventId) - 일정 삭제
 * - sendNotification(sessionId, type, studentId, daysBefore, channel) - 알림 발송
 * - getNotificationHistory(sessionId, filters) - 알림 이력
 */

// ============================================
// PUBLIC APIS
// ============================================

/**
 * Google Calendar에 일정 생성
 *
 * @param {string} sessionId - 세션 ID
 * @param {Object} eventData - 일정 데이터
 * @param {string} eventData.studentId - 학생 ID
 * @param {string} eventData.eventType - "visa_expiry" | "topik_exam" | "consultation"
 * @param {string} eventData.title - 일정 제목
 * @param {string} eventData.description - 일정 설명
 * @param {string} eventData.startDateTime - ISO 8601 (예: "2024-01-16T10:00:00+09:00")
 * @param {string} eventData.endDateTime - ISO 8601
 * @param {Array} eventData.reminders - [{method: "email", minutes: 1440}]
 *
 * @returns {Object} {success: boolean, data: {eventId, calendarId, eventUrl, createdAt}, error: string}
 */
function createCalendarEvent(sessionId, eventData) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);
    if (!session) {
      return { success: false, errorKey: 'err_invalid_session' };
    }

    // 2. 권한 검증 (master/agency만)
    if (session.role !== 'master' && session.role !== 'agency') {
      _saveAuditLog('SCHEDULE', 'CreateEvent', null, 'PERMISSION_DENIED', session.username, session.role);
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 3. 필수 파라미터 검증
    if (!eventData || !eventData.studentId || !eventData.eventType || !eventData.title ||
        !eventData.startDateTime || !eventData.endDateTime) {
      return { success: false, errorKey: 'err_required_fields' };
    }

    // 4. studentId 유효성 검사
    const student = _getStudentById(eventData.studentId);
    if (!student) {
      return { success: false, errorKey: 'err_student_not_found' };
    }

    // 5. Agency 권한인 경우 자기 유학원 학생만 가능
    if (session.role === 'agency' && student.AgencyCode !== session.agencyCode) {
      _saveAuditLog('SCHEDULE', 'CreateEvent', eventData.studentId, 'PERMISSION_DENIED', session.username, session.role);
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 6. 날짜 파싱
    const startDate = new Date(eventData.startDateTime);
    const endDate = new Date(eventData.endDateTime);

    if (isNaN(startDate) || isNaN(endDate)) {
      return { success: false, errorKey: 'err_invalid_date_format' };
    }

    // 7. Google Calendar에 일정 생성
    const calendar = CalendarApp.getDefaultCalendar();

    const options = {
      description: eventData.description || ''
    };

    // 알림 설정 (선택적)
    if (eventData.reminders && Array.isArray(eventData.reminders) && eventData.reminders.length > 0) {
      // GAS CalendarApp은 createEvent() 시 reminders 직접 지정 불가
      // 생성 후 setReminders()로 설정해야 함
    }

    const event = calendar.createEvent(eventData.title, startDate, endDate, options);

    // 알림 설정 (생성 후)
    if (eventData.reminders && Array.isArray(eventData.reminders) && eventData.reminders.length > 0) {
      const reminderConfig = {};

      eventData.reminders.forEach(reminder => {
        if (reminder.method === 'email') {
          reminderConfig.useDefault = false;
          if (!reminderConfig.email) reminderConfig.email = [];
          reminderConfig.email.push(reminder.minutes);
        } else if (reminder.method === 'popup') {
          reminderConfig.useDefault = false;
          if (!reminderConfig.popup) reminderConfig.popup = [];
          reminderConfig.popup.push(reminder.minutes);
        }
      });

      event.removeAllReminders();

      if (reminderConfig.email) {
        reminderConfig.email.forEach(minutes => event.addEmailReminder(minutes));
      }
      if (reminderConfig.popup) {
        reminderConfig.popup.forEach(minutes => event.addPopupReminder(minutes));
      }
    }

    // 8. Event ID 및 URL 생성
    const eventId = event.getId();
    const eventUrl = 'https://calendar.google.com/calendar/event?eid=' + encodeURIComponent(eventId);

    // 9. 감사 로그 기록
    _saveAuditLog('SCHEDULE', 'CreateEvent', eventData.studentId, 'SUCCESS', session.username, session.role, {
      eventType: eventData.eventType,
      eventId: eventId
    });

    // 10. 결과 반환
    return {
      success: true,
      data: {
        eventId: eventId,
        calendarId: 'primary',
        eventUrl: eventUrl,
        createdAt: new Date().toISOString()
      }
    };

  } catch (e) {
    Logger.log('ERROR in createCalendarEvent: ' + e.message);
    _saveAuditLog('SCHEDULE', 'CreateEvent', null, 'ERROR', null, null, { error: e.message });
    return { success: false, error: e.message, errorKey: 'err_schedule_create_failed' };
  }
}

/**
 * 일정 목록 조회 (월간/주간/일간 뷰)
 *
 * @param {string} sessionId - 세션 ID
 * @param {Object} params - 조회 파라미터
 * @param {string} params.startDate - "YYYY-MM-DD"
 * @param {string} params.endDate - "YYYY-MM-DD"
 * @param {Array} params.eventTypes - (optional) ["visa_expiry", "topik_exam", "consultation"]
 * @param {Array} params.studentIds - (optional) 특정 학생 필터
 *
 * @returns {Object} {success: boolean, data: {events: []}, error: string}
 */
function listCalendarEvents(sessionId, params) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);
    if (!session) {
      return { success: false, errorKey: 'err_invalid_session' };
    }

    // 2. 권한 검증
    if (session.role !== 'master' && session.role !== 'agency') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 3. 날짜 파싱
    const startDate = new Date(params.startDate);
    const endDate = new Date(params.endDate);

    if (isNaN(startDate) || isNaN(endDate)) {
      return { success: false, errorKey: 'err_invalid_date_format' };
    }

    // 4. Google Calendar에서 일정 조회
    const calendar = CalendarApp.getDefaultCalendar();
    const calendarEvents = calendar.getEvents(startDate, endDate);

    // 5. 결과 가공
    const events = calendarEvents.map(event => {
      return {
        eventId: event.getId(),
        title: event.getTitle(),
        description: event.getDescription(),
        startDateTime: event.getStartTime().toISOString(),
        endDateTime: event.getEndTime().toISOString(),
        location: event.getLocation() || '',
        isAllDay: event.isAllDayEvent()
      };
    });

    // 6. 필터링 (eventTypes, studentIds)
    let filteredEvents = events;

    // eventType 필터 (제목에서 추출)
    if (params.eventTypes && Array.isArray(params.eventTypes) && params.eventTypes.length > 0) {
      filteredEvents = filteredEvents.filter(event => {
        const title = event.title.toLowerCase();
        return params.eventTypes.some(type => {
          if (type === 'visa_expiry') return title.includes('비자') || title.includes('visa');
          if (type === 'topik_exam') return title.includes('topik') || title.includes('토픽');
          if (type === 'consultation') return title.includes('상담') || title.includes('consult');
          return false;
        });
      });
    }

    // studentId 필터 (제목에서 추출)
    if (params.studentIds && Array.isArray(params.studentIds) && params.studentIds.length > 0) {
      filteredEvents = filteredEvents.filter(event => {
        const title = event.title;
        return params.studentIds.some(studentId => title.includes(studentId));
      });
    }

    // 7. 감사 로그 기록
    _saveAuditLog('SCHEDULE', 'ListEvents', null, 'SUCCESS', session.username, session.role, {
      count: filteredEvents.length
    });

    // 8. 결과 반환
    return {
      success: true,
      data: {
        events: filteredEvents,
        total: filteredEvents.length
      }
    };

  } catch (e) {
    Logger.log('ERROR in listCalendarEvents: ' + e.message);
    _saveAuditLog('SCHEDULE', 'ListEvents', null, 'ERROR', null, null, { error: e.message });
    return { success: false, error: e.message, errorKey: 'err_schedule_list_failed' };
  }
}

/**
 * 일정 수정
 *
 * @param {string} sessionId - 세션 ID
 * @param {string} eventId - Google Calendar Event ID
 * @param {Object} eventData - 수정할 데이터
 * @param {string} eventData.title - (optional) 제목
 * @param {string} eventData.description - (optional) 설명
 * @param {string} eventData.startDateTime - (optional) 시작 시간
 * @param {string} eventData.endDateTime - (optional) 종료 시간
 *
 * @returns {Object} {success: boolean, data: {eventId, updatedAt}, error: string}
 */
function updateCalendarEvent(sessionId, eventId, eventData) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);
    if (!session) {
      return { success: false, errorKey: 'err_invalid_session' };
    }

    // 2. 권한 검증
    if (session.role !== 'master' && session.role !== 'agency') {
      _saveAuditLog('SCHEDULE', 'UpdateEvent', eventId, 'PERMISSION_DENIED', session.username, session.role);
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 3. Event 조회
    const calendar = CalendarApp.getDefaultCalendar();
    const event = calendar.getEventById(eventId);

    if (!event) {
      return { success: false, errorKey: 'err_event_not_found' };
    }

    // 4. 수정 적용
    if (eventData.title) {
      event.setTitle(eventData.title);
    }

    if (eventData.description) {
      event.setDescription(eventData.description);
    }

    if (eventData.startDateTime && eventData.endDateTime) {
      const startDate = new Date(eventData.startDateTime);
      const endDate = new Date(eventData.endDateTime);

      if (isNaN(startDate) || isNaN(endDate)) {
        return { success: false, errorKey: 'err_invalid_date_format' };
      }

      event.setTime(startDate, endDate);
    }

    // 5. 감사 로그 기록
    _saveAuditLog('SCHEDULE', 'UpdateEvent', eventId, 'SUCCESS', session.username, session.role);

    // 6. 결과 반환
    return {
      success: true,
      data: {
        eventId: eventId,
        updatedAt: new Date().toISOString()
      }
    };

  } catch (e) {
    Logger.log('ERROR in updateCalendarEvent: ' + e.message);
    _saveAuditLog('SCHEDULE', 'UpdateEvent', eventId, 'ERROR', null, null, { error: e.message });
    return { success: false, error: e.message, errorKey: 'err_schedule_update_failed' };
  }
}

/**
 * 일정 삭제
 *
 * @param {string} sessionId - 세션 ID
 * @param {string} eventId - Google Calendar Event ID
 *
 * @returns {Object} {success: boolean, data: {eventId, deletedAt}, error: string}
 */
function deleteCalendarEvent(sessionId, eventId) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);
    if (!session) {
      return { success: false, errorKey: 'err_invalid_session' };
    }

    // 2. 권한 검증 (master만)
    if (session.role !== 'master') {
      _saveAuditLog('SCHEDULE', 'DeleteEvent', eventId, 'PERMISSION_DENIED', session.username, session.role);
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 3. Event 조회 및 삭제
    const calendar = CalendarApp.getDefaultCalendar();
    const event = calendar.getEventById(eventId);

    if (!event) {
      return { success: false, errorKey: 'err_event_not_found' };
    }

    event.deleteEvent();

    // 4. 감사 로그 기록
    _saveAuditLog('SCHEDULE', 'DeleteEvent', eventId, 'SUCCESS', session.username, session.role);

    // 5. 결과 반환
    return {
      success: true,
      data: {
        eventId: eventId,
        deletedAt: new Date().toISOString()
      }
    };

  } catch (e) {
    Logger.log('ERROR in deleteCalendarEvent: ' + e.message);
    _saveAuditLog('SCHEDULE', 'DeleteEvent', eventId, 'ERROR', null, null, { error: e.message });
    return { success: false, error: e.message, errorKey: 'err_schedule_delete_failed' };
  }
}

/**
 * 알림 발송 (이메일/SMS)
 *
 * @param {string} sessionId - 세션 ID
 * @param {string} type - "visa_expiry" | "topik_exam" | "consultation"
 * @param {string} studentId - 학생 ID
 * @param {number} daysBefore - D-n일 전 (예: 30, 14, 7, 1)
 * @param {string} channel - "email" | "sms" (SMS는 선택적, 현재는 email만)
 *
 * @returns {Object} {success: boolean, data: {notificationId, status, sentAt}, error: string}
 */
function sendNotification(sessionId, type, studentId, daysBefore, channel) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);
    if (!session) {
      return { success: false, errorKey: 'err_invalid_session' };
    }

    // 2. 권한 검증 (master/agency만)
    if (session.role !== 'master' && session.role !== 'agency') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 3. 파라미터 검증
    if (!type || !studentId || !daysBefore || !channel) {
      return { success: false, errorKey: 'err_required_fields' };
    }

    // 4. 학생 정보 조회
    const student = _getStudentFullInfo(studentId);
    if (!student) {
      return { success: false, errorKey: 'err_student_not_found' };
    }

    // 5. Agency 권한인 경우 자기 유학원 학생만 가능
    if (session.role === 'agency' && student.AgencyCode !== session.agencyCode) {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 6. 알림 메시지 생성 (KO/VN 지원)
    const message = _generateNotificationMessage(type, student, daysBefore, 'ko');

    // 7. 이메일 발송
    if (channel === 'email') {
      const emailResult = _sendEmail(student.Email, message.subject, message.body);

      if (!emailResult.success) {
        // 알림 실패 기록
        _saveNotificationHistory({
          type: type,
          studentId: studentId,
          channel: channel,
          status: 'failed',
          error: emailResult.error
        });

        return { success: false, error: emailResult.error, errorKey: 'err_notification_send_failed' };
      }
    }

    // 8. Notifications 시트에 기록
    const notificationId = _saveNotificationHistory({
      type: type,
      studentId: studentId,
      channel: channel,
      daysBefore: daysBefore,
      status: 'sent',
      sentAt: new Date().toISOString()
    });

    // 9. 감사 로그 기록
    _saveAuditLog('NOTIFICATION', 'SendNotification', studentId, 'SUCCESS', session.username, session.role, {
      type: type,
      channel: channel,
      daysBefore: daysBefore
    });

    // 10. 결과 반환
    return {
      success: true,
      data: {
        notificationId: notificationId,
        status: 'sent',
        sentAt: new Date().toISOString()
      }
    };

  } catch (e) {
    Logger.log('ERROR in sendNotification: ' + e.message);
    _saveAuditLog('NOTIFICATION', 'SendNotification', studentId, 'ERROR', null, null, { error: e.message });
    return { success: false, error: e.message, errorKey: 'err_notification_send_failed' };
  }
}

/**
 * 알림 이력 조회
 *
 * @param {string} sessionId - 세션 ID
 * @param {Object} filters - 필터 조건
 * @param {string} filters.startDate - (optional) "YYYY-MM-DD"
 * @param {string} filters.endDate - (optional) "YYYY-MM-DD"
 * @param {string} filters.type - (optional) "visa_expiry" | "topik_exam" | "consultation"
 * @param {string} filters.status - (optional) "sent" | "failed"
 * @param {string} filters.studentId - (optional) 특정 학생
 *
 * @returns {Object} {success: boolean, data: {notifications: [], total: number}, error: string}
 */
function getNotificationHistory(sessionId, filters) {
  try {
    // 1. 세션 검증
    const session = _validateSession(sessionId);
    if (!session) {
      return { success: false, errorKey: 'err_invalid_session' };
    }

    // 2. 권한 검증
    if (session.role !== 'master' && session.role !== 'agency') {
      return { success: false, errorKey: 'err_permission_denied' };
    }

    // 3. Notifications 시트 읽기
    const sheet = _getSheet(SHEETS.NOTIFICATIONS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return {
        success: true,
        data: {
          notifications: [],
          total: 0
        }
      };
    }

    const headers = data[0];
    const notificationIdIndex = headers.indexOf('NotificationID');
    const typeIndex = headers.indexOf('Type');
    const studentIdIndex = headers.indexOf('StudentID');
    const channelIndex = headers.indexOf('Channel');
    const daysBeforeIndex = headers.indexOf('DaysBefore');
    const statusIndex = headers.indexOf('Status');
    const sentAtIndex = headers.indexOf('SentAt');
    const errorIndex = headers.indexOf('Error');

    let notifications = [];

    for (let i = 1; i < data.length; i++) {
      notifications.push({
        notificationId: data[i][notificationIdIndex],
        type: data[i][typeIndex],
        studentId: data[i][studentIdIndex],
        channel: data[i][channelIndex],
        daysBefore: data[i][daysBeforeIndex],
        status: data[i][statusIndex],
        sentAt: data[i][sentAtIndex],
        error: data[i][errorIndex] || null
      });
    }

    // 4. 필터링
    if (filters) {
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        notifications = notifications.filter(n => new Date(n.sentAt) >= startDate);
      }

      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        notifications = notifications.filter(n => new Date(n.sentAt) <= endDate);
      }

      if (filters.type) {
        notifications = notifications.filter(n => n.type === filters.type);
      }

      if (filters.status) {
        notifications = notifications.filter(n => n.status === filters.status);
      }

      if (filters.studentId) {
        notifications = notifications.filter(n => n.studentId === filters.studentId);
      }
    }

    // 5. Agency 권한인 경우 자기 유학원 학생만
    if (session.role === 'agency') {
      const agencyStudents = _getAgencyStudentIds(session.agencyCode);
      notifications = notifications.filter(n => agencyStudents.includes(n.studentId));
    }

    // 6. 최신순 정렬
    notifications.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    // 7. 감사 로그 기록
    _saveAuditLog('NOTIFICATION', 'GetHistory', null, 'SUCCESS', session.username, session.role, {
      count: notifications.length
    });

    // 8. 결과 반환
    return {
      success: true,
      data: {
        notifications: notifications,
        total: notifications.length
      }
    };

  } catch (e) {
    Logger.log('ERROR in getNotificationHistory: ' + e.message);
    _saveAuditLog('NOTIFICATION', 'GetHistory', null, 'ERROR', null, null, { error: e.message });
    return { success: false, error: e.message, errorKey: 'err_notification_history_failed' };
  }
}

// ============================================
// HELPER FUNCTIONS (Private)
// ============================================

/**
 * StudentID로 학생 정보 조회 (Private)
 *
 * @param {string} studentId - 학생 ID
 * @returns {Object|null} 학생 정보 또는 null
 */
function _getStudentById(studentId) {
  try {
    const sheet = _getSheet(SHEETS.STUDENTS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) return null;

    const headers = data[0];
    const studentIdIndex = headers.indexOf('StudentID');
    const agencyCodeIndex = headers.indexOf('AgencyCode');

    for (let i = 1; i < data.length; i++) {
      if (data[i][studentIdIndex] === studentId) {
        return {
          StudentID: data[i][studentIdIndex],
          AgencyCode: data[i][agencyCodeIndex]
        };
      }
    }

    return null;

  } catch (e) {
    Logger.log('ERROR in _getStudentById: ' + e.message);
    return null;
  }
}

/**
 * StudentID로 학생 전체 정보 조회 (Email 포함)
 *
 * @param {string} studentId - 학생 ID
 * @returns {Object|null} 학생 전체 정보 또는 null
 */
function _getStudentFullInfo(studentId) {
  try {
    const sheet = _getSheet(SHEETS.STUDENTS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) return null;

    const headers = data[0];
    const studentIdIndex = headers.indexOf('StudentID');
    const nameKRIndex = headers.indexOf('NameKR');
    const emailIndex = headers.indexOf('Email');
    const agencyCodeIndex = headers.indexOf('AgencyCode');

    for (let i = 1; i < data.length; i++) {
      if (data[i][studentIdIndex] === studentId) {
        return {
          StudentID: data[i][studentIdIndex],
          NameKR: data[i][nameKRIndex],
          Email: data[i][emailIndex],
          AgencyCode: data[i][agencyCodeIndex]
        };
      }
    }

    return null;

  } catch (e) {
    Logger.log('ERROR in _getStudentFullInfo: ' + e.message);
    return null;
  }
}

/**
 * 알림 메시지 생성 (KO/VN 지원)
 *
 * @param {string} type - "visa_expiry" | "topik_exam" | "consultation"
 * @param {Object} student - 학생 정보
 * @param {number} daysBefore - D-n일 전
 * @param {string} lang - "ko" | "vi"
 * @returns {Object} {subject: string, body: string}
 */
function _generateNotificationMessage(type, student, daysBefore, lang) {
  lang = lang || 'ko';

  const messages = {
    ko: {
      visa_expiry: {
        subject: '[AJU E&J] 비자 만료 알림 (D-' + daysBefore + ')',
        body: student.NameKR + ' 학생님,\n\n' +
              '귀하의 비자가 ' + daysBefore + '일 후에 만료됩니다.\n' +
              '비자 연장 신청을 진행해주시기 바랍니다.\n\n' +
              '문의사항이 있으시면 담당자에게 연락 주시기 바랍니다.\n\n' +
              'AJU E&J 학생관리팀'
      },
      topik_exam: {
        subject: '[AJU E&J] TOPIK 시험 안내 (D-' + daysBefore + ')',
        body: student.NameKR + ' 학생님,\n\n' +
              'TOPIK 시험이 ' + daysBefore + '일 후에 있습니다.\n' +
              '시험 준비를 철저히 해주시기 바랍니다.\n\n' +
              '시험 장소 및 시간은 별도 안내드립니다.\n\n' +
              'AJU E&J 학생관리팀'
      },
      consultation: {
        subject: '[AJU E&J] 상담 일정 알림 (D-' + daysBefore + ')',
        body: student.NameKR + ' 학생님,\n\n' +
              '상담 일정이 ' + daysBefore + '일 후에 있습니다.\n' +
              '지정된 시간에 맞춰 준비해주시기 바랍니다.\n\n' +
              '문의사항이 있으시면 담당자에게 연락 주시기 바랍니다.\n\n' +
              'AJU E&J 학생관리팀'
      }
    },
    vi: {
      visa_expiry: {
        subject: '[AJU E&J] Thông báo hết hạn visa (D-' + daysBefore + ')',
        body: 'Sinh viên ' + student.NameKR + ',\n\n' +
              'Visa của bạn sẽ hết hạn sau ' + daysBefore + ' ngày.\n' +
              'Vui lòng thực hiện gia hạn visa.\n\n' +
              'Nếu có thắc mắc, vui lòng liên hệ người phụ trách.\n\n' +
              'Đội Quản Lý Sinh Viên AJU E&J'
      },
      topik_exam: {
        subject: '[AJU E&J] Hướng dẫn kỳ thi TOPIK (D-' + daysBefore + ')',
        body: 'Sinh viên ' + student.NameKR + ',\n\n' +
              'Kỳ thi TOPIK sẽ diễn ra sau ' + daysBefore + ' ngày.\n' +
              'Vui lòng chuẩn bị kỹ càng cho kỳ thi.\n\n' +
              'Địa điểm và thời gian thi sẽ được thông báo riêng.\n\n' +
              'Đội Quản Lý Sinh Viên AJU E&J'
      },
      consultation: {
        subject: '[AJU E&J] Nhắc lịch tư vấn (D-' + daysBefore + ')',
        body: 'Sinh viên ' + student.NameKR + ',\n\n' +
              'Lịch tư vấn của bạn sẽ diễn ra sau ' + daysBefore + ' ngày.\n' +
              'Vui lòng chuẩn bị theo thời gian đã định.\n\n' +
              'Nếu có thắc mắc, vui lòng liên hệ người phụ trách.\n\n' +
              'Đội Quản Lý Sinh Viên AJU E&J'
      }
    }
  };

  return messages[lang][type] || messages['ko'][type];
}

/**
 * 이메일 발송 (GmailApp 사용)
 *
 * @param {string} to - 수신자 이메일
 * @param {string} subject - 제목
 * @param {string} body - 본문
 * @returns {Object} {success: boolean, error: string}
 */
function _sendEmail(to, subject, body) {
  try {
    if (!to || !subject || !body) {
      return { success: false, error: 'Missing required fields' };
    }

    GmailApp.sendEmail(to, subject, body);

    return { success: true };

  } catch (e) {
    Logger.log('ERROR in _sendEmail: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Notifications 시트에 알림 이력 저장
 *
 * @param {Object} notification - 알림 데이터
 * @returns {string} NotificationID
 */
function _saveNotificationHistory(notification) {
  try {
    const sheet = _getSheet(SHEETS.NOTIFICATIONS);
    const notificationId = 'NOTI-' + Utilities.formatDate(new Date(), 'GMT+9', 'yyyyMMddHHmmss') + '-' + Math.floor(Math.random() * 10000);

    sheet.appendRow([
      notificationId,
      notification.type,
      notification.studentId,
      notification.channel,
      notification.daysBefore || 0,
      notification.status,
      notification.sentAt || new Date().toISOString(),
      notification.error || ''
    ]);

    return notificationId;

  } catch (e) {
    Logger.log('ERROR in _saveNotificationHistory: ' + e.message);
    return null;
  }
}

/**
 * 유학원 소속 학생 ID 목록 조회
 *
 * @param {string} agencyCode - 유학원 코드
 * @returns {Array} 학생 ID 배열
 */
function _getAgencyStudentIds(agencyCode) {
  try {
    const sheet = _getSheet(SHEETS.STUDENTS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) return [];

    const headers = data[0];
    const studentIdIndex = headers.indexOf('StudentID');
    const agencyCodeIndex = headers.indexOf('AgencyCode');

    const studentIds = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][agencyCodeIndex] === agencyCode) {
        studentIds.push(data[i][studentIdIndex]);
      }
    }

    return studentIds;

  } catch (e) {
    Logger.log('ERROR in _getAgencyStudentIds: ' + e.message);
    return [];
  }
}

// ============================================
// UNIT TESTS
// ============================================

/**
 * ScheduleService 통합 테스트
 */
function testScheduleService() {
  Logger.log('========================================');
  Logger.log('SCHEDULE SERVICE TESTS');
  Logger.log('========================================\n');

  try {
    // 테스트 세션 생성 (MASTER 권한)
    const sessionId = 'test-schedule-session-' + new Date().getTime();
    const cache = CacheService.getScriptCache();
    cache.put(
      sessionId,
      JSON.stringify({ username: 'MASTER', role: 'master', agencyCode: 'MASTER' }),
      1800
    );

    // Test 1: Create Calendar Event
    Logger.log('[1/4] Testing createCalendarEvent...');
    const createResult = createCalendarEvent(sessionId, {
      studentId: '260010001',
      eventType: 'visa_expiry',
      title: '[테스트] 비자 만료 - 학생 260010001',
      description: '비자 연장 신청 필요 (테스트)',
      startDateTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후
      endDateTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // +1시간
      reminders: [
        { method: 'email', minutes: 1440 } // 1일 전
      ]
    });

    if (createResult.success) {
      Logger.log('  ✅ Create Success | Event ID: ' + createResult.data.eventId);
    } else {
      Logger.log('  ❌ Create Failed: ' + createResult.error);
    }

    // Test 2: List Calendar Events
    Logger.log('\n[2/4] Testing listCalendarEvents...');
    const listResult = listCalendarEvents(sessionId, {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 60일 후
    });

    if (listResult.success) {
      Logger.log('  ✅ List Success | Total Events: ' + listResult.data.total);
    } else {
      Logger.log('  ❌ List Failed: ' + listResult.error);
    }

    // Test 3: Update Calendar Event
    if (createResult.success) {
      Logger.log('\n[3/4] Testing updateCalendarEvent...');
      const updateResult = updateCalendarEvent(sessionId, createResult.data.eventId, {
        title: '[테스트] 비자 만료 (수정됨)'
      });

      if (updateResult.success) {
        Logger.log('  ✅ Update Success');
      } else {
        Logger.log('  ❌ Update Failed: ' + updateResult.error);
      }
    }

    // Test 4: Send Notification
    Logger.log('\n[4/6] Testing sendNotification...');
    const sendResult = sendNotification(sessionId, 'visa_expiry', '260010001', 30, 'email');

    if (sendResult.success) {
      Logger.log('  ✅ Send Notification Success | ID: ' + sendResult.data.notificationId);
    } else {
      Logger.log('  ❌ Send Notification Failed: ' + sendResult.error);
    }

    // Test 5: Get Notification History
    Logger.log('\n[5/6] Testing getNotificationHistory...');
    const historyResult = getNotificationHistory(sessionId, {
      type: 'visa_expiry'
    });

    if (historyResult.success) {
      Logger.log('  ✅ Get History Success | Total: ' + historyResult.data.total);
    } else {
      Logger.log('  ❌ Get History Failed: ' + historyResult.error);
    }

    // Test 6: Delete Calendar Event
    if (createResult.success) {
      Logger.log('\n[6/6] Testing deleteCalendarEvent...');
      const deleteResult = deleteCalendarEvent(sessionId, createResult.data.eventId);

      if (deleteResult.success) {
        Logger.log('  ✅ Delete Success');
      } else {
        Logger.log('  ❌ Delete Failed: ' + deleteResult.error);
      }
    }

    Logger.log('\n========================================');
    Logger.log('✅ SCHEDULE SERVICE TESTS COMPLETED!');
    Logger.log('========================================');

  } catch (e) {
    Logger.log('❌ TEST ERROR: ' + e.message);
    Logger.log(e.stack);
  }
}

// ============================================
// AUTO NOTIFICATION SYSTEM (Time-based Triggers)
// ============================================

/**
 * 매일 09:00 KST에 실행되는 자동 알림 처리 함수
 * - 비자 만료 알림 (D-30, D-14, D-7, D-1)
 * - TOPIK 시험 알림 (D-30, D-14, D-7, D-1)
 * - 상담 일정 알림 (D-1, 당일 09:00)
 *
 * @returns {Object} {success: boolean, summary: Object}
 */
function processDailyNotifications() {
  try {
    Logger.log('========================================');
    Logger.log('PROCESSING DAILY NOTIFICATIONS');
    Logger.log('Time: ' + new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
    Logger.log('========================================');

    const summary = {
      visa: { sent: 0, failed: 0 },
      topik: { sent: 0, failed: 0 },
      consult: { sent: 0, failed: 0 },
      total: { sent: 0, failed: 0 }
    };

    // 1. 비자 만료 알림 확인
    Logger.log('\n[1/3] Checking Visa Expiry Notifications...');
    const visaResult = _checkVisaExpiryNotifications();
    summary.visa = visaResult;
    summary.total.sent += visaResult.sent;
    summary.total.failed += visaResult.failed;
    Logger.log(`  ✅ Visa: ${visaResult.sent} sent, ${visaResult.failed} failed`);

    // 2. TOPIK 시험 알림 확인
    Logger.log('\n[2/3] Checking TOPIK Exam Notifications...');
    const topikResult = _checkTopikExamNotifications();
    summary.topik = topikResult;
    summary.total.sent += topikResult.sent;
    summary.total.failed += topikResult.failed;
    Logger.log(`  ✅ TOPIK: ${topikResult.sent} sent, ${topikResult.failed} failed`);

    // 3. 상담 일정 알림 확인
    Logger.log('\n[3/3] Checking Consultation Notifications...');
    const consultResult = _checkConsultationNotifications();
    summary.consult = consultResult;
    summary.total.sent += consultResult.sent;
    summary.total.failed += consultResult.failed;
    Logger.log(`  ✅ Consult: ${consultResult.sent} sent, ${consultResult.failed} failed`);

    Logger.log('\n========================================');
    Logger.log('DAILY NOTIFICATIONS COMPLETED');
    Logger.log(`Total Sent: ${summary.total.sent}, Failed: ${summary.total.failed}`);
    Logger.log('========================================');

    return { success: true, summary };

  } catch (e) {
    Logger.log('❌ ERROR in processDailyNotifications: ' + e.message);
    Logger.log(e.stack);
    return { success: false, error: e.message };
  }
}

/**
 * 비자 만료 알림 확인 및 발송 (D-30, D-14, D-7, D-1)
 * @returns {Object} {sent: number, failed: number}
 */
function _checkVisaExpiryNotifications() {
  const result = { sent: 0, failed: 0 };

  try {
    const studentsSheet = _getSheet(SHEETS.STUDENTS);
    const data = studentsSheet.getDataRange().getValues();
    if (data.length <= 1) return result;

    const headers = data[0];
    const studentIdIndex = headers.indexOf('StudentID');
    const visaExpiryIndex = headers.indexOf('VisaExpiryDate');
    const statusIndex = headers.indexOf('Status');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysToCheck = [30, 14, 7, 1]; // D-30, D-14, D-7, D-1

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const studentId = row[studentIdIndex];
      const visaExpiry = row[visaExpiryIndex];
      const status = row[statusIndex];

      // 비활성 학생은 건너뛰기
      if (!studentId || !visaExpiry || status === 'Inactive') continue;

      const expiryDate = new Date(visaExpiry);
      expiryDate.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

      // D-30, D-14, D-7, D-1에 해당하면 알림 발송
      if (daysToCheck.includes(diffDays)) {
        const sendResult = _sendNotificationDirect('visa_expiry', studentId, diffDays, 'email');
        if (sendResult.success) {
          result.sent++;
          Logger.log(`  → Visa notification sent: ${studentId} (D-${diffDays})`);
        } else {
          result.failed++;
          Logger.log(`  → Visa notification failed: ${studentId} (D-${diffDays}): ${sendResult.error}`);
        }
      }
    }

  } catch (e) {
    Logger.log('ERROR in _checkVisaExpiryNotifications: ' + e.message);
  }

  return result;
}

/**
 * TOPIK 시험 알림 확인 및 발송 (D-30, D-14, D-7, D-1)
 *
 * 2024년 TOPIK 시험 일정:
 * - 88회: 2024-01-14 (일)
 * - 89회: 2024-04-14 (일)
 * - 90회: 2024-05-12 (일)
 * - 91회: 2024-07-14 (일)
 * - 92회: 2024-10-13 (일)
 * - 93회: 2024-11-17 (일)
 *
 * @returns {Object} {sent: number, failed: number}
 */
function _checkTopikExamNotifications() {
  const result = { sent: 0, failed: 0 };

  try {
    // 2024-2025 TOPIK 시험 일정 (예시)
    const topikDates = [
      new Date('2024-01-14'),
      new Date('2024-04-14'),
      new Date('2024-05-12'),
      new Date('2024-07-14'),
      new Date('2024-10-13'),
      new Date('2024-11-17'),
      new Date('2025-01-12'),
      new Date('2025-04-13'),
      new Date('2025-05-11'),
      new Date('2025-07-13'),
      new Date('2025-10-12'),
      new Date('2025-11-16')
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysToCheck = [30, 14, 7, 1]; // D-30, D-14, D-7, D-1

    // 다가오는 TOPIK 시험일 확인
    const upcomingExams = topikDates.filter(examDate => {
      examDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
      return daysToCheck.includes(diffDays);
    });

    if (upcomingExams.length === 0) {
      return result; // 알림 발송할 시험 없음
    }

    // 모든 Active 학생에게 알림
    const studentsSheet = _getSheet(SHEETS.STUDENTS);
    const data = studentsSheet.getDataRange().getValues();
    if (data.length <= 1) return result;

    const headers = data[0];
    const studentIdIndex = headers.indexOf('StudentID');
    const statusIndex = headers.indexOf('Status');

    for (const examDate of upcomingExams) {
      const diffDays = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const studentId = row[studentIdIndex];
        const status = row[statusIndex];

        // 비활성 학생은 건너뛰기
        if (!studentId || status === 'Inactive') continue;

        const sendResult = _sendNotificationDirect('topik_exam', studentId, diffDays, 'email');
        if (sendResult.success) {
          result.sent++;
          Logger.log(`  → TOPIK notification sent: ${studentId} (D-${diffDays}, Exam: ${examDate.toISOString().split('T')[0]})`);
        } else {
          result.failed++;
          Logger.log(`  → TOPIK notification failed: ${studentId} (D-${diffDays}): ${sendResult.error}`);
        }
      }
    }

  } catch (e) {
    Logger.log('ERROR in _checkTopikExamNotifications: ' + e.message);
  }

  return result;
}

/**
 * 상담 일정 알림 확인 및 발송 (D-1, 당일 09:00)
 * @returns {Object} {sent: number, failed: number}
 */
function _checkConsultationNotifications() {
  const result = { sent: 0, failed: 0 };

  try {
    const consultSheet = _getSheet(SHEETS.CONSULTATIONS);
    const data = consultSheet.getDataRange().getValues();
    if (data.length <= 1) return result;

    const headers = data[0];
    const studentIdIndex = headers.indexOf('StudentID');
    const consultDateIndex = headers.indexOf('ConsultDate');
    const statusIndex = headers.indexOf('Status');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const studentId = row[studentIdIndex];
      const consultDate = row[consultDateIndex];
      const status = row[statusIndex];

      // 완료된 상담 또는 취소된 상담은 건너뛰기
      if (!studentId || !consultDate || status === 'Completed' || status === 'Cancelled') continue;

      const consultDateObj = new Date(consultDate);
      consultDateObj.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((consultDateObj - today) / (1000 * 60 * 60 * 24));

      // D-1 (하루 전) 알림
      if (diffDays === 1) {
        const sendResult = _sendNotificationDirect('consultation', studentId, diffDays, 'email');
        if (sendResult.success) {
          result.sent++;
          Logger.log(`  → Consultation notification sent: ${studentId} (D-${diffDays})`);
        } else {
          result.failed++;
          Logger.log(`  → Consultation notification failed: ${studentId} (D-${diffDays}): ${sendResult.error}`);
        }
      }
    }

  } catch (e) {
    Logger.log('ERROR in _checkConsultationNotifications: ' + e.message);
  }

  return result;
}

/**
 * 세션 없이 직접 알림 발송 (내부용)
 * @param {string} type - "visa_expiry" | "topik_exam" | "consultation"
 * @param {string} studentId - 학생 ID
 * @param {number} daysBefore - D-n
 * @param {string} channel - "email" | "sms"
 * @returns {Object} {success: boolean, error?: string}
 */
function _sendNotificationDirect(type, studentId, daysBefore, channel) {
  try {
    // 학생 정보 조회
    const student = _getStudentFullInfo(studentId);
    if (!student) {
      return { success: false, error: 'Student not found' };
    }

    // 알림 메시지 생성 (한국어 우선)
    const message = _generateNotificationMessage(type, student, daysBefore, 'ko');

    // 이메일 발송
    if (channel === 'email') {
      const emailResult = _sendEmail(student.Email, message.subject, message.body);
      if (!emailResult.success) {
        return emailResult;
      }
    }

    // 알림 이력 저장
    const notification = {
      StudentID: studentId,
      Type: type,
      DaysBefore: daysBefore,
      Channel: channel,
      SentAt: new Date().toISOString(),
      Status: 'Success',
      ErrorMsg: ''
    };
    _saveNotificationHistory(notification);

    return { success: true };

  } catch (e) {
    Logger.log('ERROR in _sendNotificationDirect: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 매일 09:00 KST 자동 알림 Trigger 설정
 * - 중복 Trigger 자동 삭제
 * - 매일 09:00에 processDailyNotifications() 실행
 *
 * 실행 방법:
 * 1. GAS 에디터에서 이 함수 실행
 * 2. 권한 승인 (Calendar, Gmail 필요)
 * 3. 트리거 → 내 트리거에서 확인
 *
 * @returns {Object} {success: boolean, triggerId?: string}
 */
function setupDailyNotificationTrigger() {
  try {
    // 1. 기존 Trigger 삭제 (중복 방지)
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'processDailyNotifications') {
        ScriptApp.deleteTrigger(trigger);
        Logger.log('🗑️ Deleted existing trigger: ' + trigger.getUniqueId());
      }
    });

    // 2. 새 Trigger 생성 (매일 09:00 KST)
    const trigger = ScriptApp.newTrigger('processDailyNotifications')
      .timeBased()
      .atHour(9)  // 09:00
      .everyDays(1)  // 매일
      .inTimezone('Asia/Seoul')  // KST
      .create();

    Logger.log('========================================');
    Logger.log('✅ DAILY NOTIFICATION TRIGGER CREATED!');
    Logger.log('  Function: processDailyNotifications');
    Logger.log('  Schedule: Every day at 09:00 KST');
    Logger.log('  Trigger ID: ' + trigger.getUniqueId());
    Logger.log('========================================');

    return { success: true, triggerId: trigger.getUniqueId() };

  } catch (e) {
    Logger.log('❌ ERROR in setupDailyNotificationTrigger: ' + e.message);
    Logger.log(e.stack);
    return { success: false, error: e.message };
  }
}

/**
 * 자동 알림 Trigger 삭제
 * @returns {Object} {success: boolean, deleted: number}
 */
function removeDailyNotificationTrigger() {
  try {
    let deleted = 0;
    const triggers = ScriptApp.getProjectTriggers();

    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'processDailyNotifications') {
        ScriptApp.deleteTrigger(trigger);
        deleted++;
        Logger.log('🗑️ Deleted trigger: ' + trigger.getUniqueId());
      }
    });

    Logger.log(`✅ Removed ${deleted} daily notification trigger(s)`);

    return { success: true, deleted };

  } catch (e) {
    Logger.log('❌ ERROR in removeDailyNotificationTrigger: ' + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 수동 테스트용: 알림 시스템 테스트
 */
function testDailyNotifications() {
  Logger.log('========================================');
  Logger.log('TESTING DAILY NOTIFICATIONS');
  Logger.log('========================================');

  const result = processDailyNotifications();

  if (result.success) {
    Logger.log('\n✅ Test completed successfully!');
    Logger.log('Summary:', JSON.stringify(result.summary, null, 2));
  } else {
    Logger.log('\n❌ Test failed: ' + result.error);
  }
}
