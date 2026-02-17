/**
 * FileService.gs - 파일 관리 서비스
 * Week 5-6: File Upload & Management
 *
 * APIs:
 * - uploadFile(studentId, category, file)
 * - listFiles(studentId, category)
 * - downloadFile(fileId)
 * - deleteFile(fileId)
 * - getFileThumbnail(fileId)
 */

/**
 * 파일 업로드
 * @param {string} studentId - 학생 ID
 * @param {string} category - 파일 카테고리 ("certificate"|"admin"|"photo"|"other")
 * @param {Object} file - { name: string, mimeType: string, content: Blob }
 * @returns {Object} { success, data, error, errorKey }
 */
function uploadFile(studentId, category, file) {
  try {
    // 1. 세션 검증
    const sessionId = _getSessionIdFromRequest();
    const session = _validateSession(sessionId);
    if (!session) {
      return { success: false, error: 'Invalid session', errorKey: 'err_session_invalid' };
    }

    // 2. 권한 검증 (master/agency, 본인 학생만)
    const permCheck = _validatePermission(session, 'CREATE', SHEETS.FILES, studentId);
    if (!permCheck.success) {
      return { success: false, error: permCheck.error, errorKey: 'err_permission_denied' };
    }

    // 3. 파일 유효성 검사
    const validation = _validateFileUpload(file);
    if (!validation.success) {
      return { success: false, error: validation.error, errorKey: validation.errorKey };
    }

    // 4. 폴더 구조 생성 (없으면 자동 생성)
    const folder = _getOrCreateStudentFolder(studentId, category);

    // 5. Google Drive API 업로드
    const driveFile = folder.createFile(
      Utilities.newBlob(file.content, file.mimeType, file.name)
    );

    // 공유 설정
    driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // 6. Files 시트에 메타데이터 저장
    const fileId = generateFileID();
    const fileUrl = 'https://drive.google.com/file/d/' + driveFile.getId() + '/view';
    const uploadedAt = getCurrentTimestamp();

    _appendRow(SHEETS.FILES, {
      FileID: fileId,
      StudentID: studentId,
      Category: category,
      FileName: file.name,
      DriveFileID: driveFile.getId(),
      MimeType: file.mimeType,
      FileSize: driveFile.getSize(),
      UploadedAt: uploadedAt,
      UploadedBy: sessionId
    });

    // 7. 감사 로그 기록
    _saveAuditLog('FILE', 'Upload', studentId, {
      fileId: fileId,
      fileName: file.name,
      category: category,
      fileSize: driveFile.getSize()
    });

    // 8. 결과 반환
    return {
      success: true,
      data: {
        fileId: fileId,
        driveFileId: driveFile.getId(),
        fileName: file.name,
        fileUrl: fileUrl,
        uploadedAt: uploadedAt
      }
    };

  } catch (e) {
    _saveAuditLog('FILE', 'UploadError', studentId, { error: e.message });
    return { success: false, error: e.message, errorKey: 'err_file_upload_failed' };
  }
}

/**
 * 파일 목록 조회
 * @param {string} studentId - 학생 ID
 * @param {string} category - (optional) 파일 카테고리
 * @returns {Object} { success, data: { files, totalCount, totalSize }, error }
 */
function listFiles(studentId, category) {
  try {
    // 1. 세션 검증
    const sessionId = _getSessionIdFromRequest();
    const session = _validateSession(sessionId);
    if (!session) {
      return { success: false, error: 'Invalid session', errorKey: 'err_session_invalid' };
    }

    // 2. 권한 검증 (master/agency, 본인 학생만)
    const permCheck = _validatePermission(session, 'READ', SHEETS.FILES, studentId);
    if (!permCheck.success) {
      return { success: false, error: permCheck.error, errorKey: 'err_permission_denied' };
    }

    // 3. Files 시트 읽기
    const allFiles = _getAllRows(SHEETS.FILES);

    // 4. studentId 필터 적용
    let filteredFiles = allFiles.filter(file => file.StudentID === studentId);

    // 5. category 필터 적용 (optional)
    if (category) {
      filteredFiles = filteredFiles.filter(file => file.Category === category);
    }

    // 6. Google Drive API로 파일 정보 보강
    const files = filteredFiles.map(file => {
      try {
        const driveFile = DriveApp.getFileById(file.DriveFileID);
        const fileUrl = 'https://drive.google.com/file/d/' + file.DriveFileID + '/view';

        // 썸네일 URL (이미지만)
        let thumbnailUrl = '';
        if (file.MimeType && file.MimeType.startsWith('image/')) {
          thumbnailUrl = 'https://drive.google.com/thumbnail?id=' + file.DriveFileID + '&sz=w200-h200';
        }

        return {
          fileId: file.FileID,
          fileName: file.FileName,
          category: file.Category,
          fileSize: file.FileSize || driveFile.getSize(),
          mimeType: file.MimeType,
          uploadedAt: file.UploadedAt,
          uploadedBy: file.UploadedBy,
          fileUrl: fileUrl,
          thumbnailUrl: thumbnailUrl
        };
      } catch (e) {
        // Drive 파일 접근 실패 시 메타데이터만 반환
        return {
          fileId: file.FileID,
          fileName: file.FileName,
          category: file.Category,
          fileSize: file.FileSize,
          mimeType: file.MimeType,
          uploadedAt: file.UploadedAt,
          uploadedBy: file.UploadedBy,
          fileUrl: '',
          thumbnailUrl: '',
          error: 'Drive file not accessible'
        };
      }
    });

    // 7. 결과 정렬 (uploadedAt 내림차순)
    files.sort((a, b) => {
      const dateA = new Date(a.uploadedAt);
      const dateB = new Date(b.uploadedAt);
      return dateB - dateA;
    });

    // 8. 총 용량 계산
    const totalSize = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);

    // 9. 반환
    return {
      success: true,
      data: {
        files: files,
        totalCount: files.length,
        totalSize: totalSize
      }
    };

  } catch (e) {
    _saveAuditLog('FILE', 'ListError', studentId, { error: e.message });
    return { success: false, error: e.message, errorKey: 'err_file_list_failed' };
  }
}

/**
 * 파일 다운로드 URL 생성
 * @param {string} fileId - 파일 ID
 * @returns {Object} { success, data: { fileId, fileName, downloadUrl }, error }
 */
function downloadFile(fileId) {
  try {
    // 1. 세션 검증
    const sessionId = _getSessionIdFromRequest();
    const session = _validateSession(sessionId);
    if (!session) {
      return { success: false, error: 'Invalid session', errorKey: 'err_session_invalid' };
    }

    // 3. Files 시트에서 fileId 조회
    const allFiles = _getAllRows(SHEETS.FILES);
    const fileRecord = allFiles.find(file => file.FileID === fileId);

    if (!fileRecord) {
      return { success: false, error: 'File not found', errorKey: 'err_file_not_found' };
    }

    // 2. 권한 검증 (master/agency, 본인 학생만)
    const permCheck = _validatePermission(session, 'READ', SHEETS.FILES, fileRecord.StudentID);
    if (!permCheck.success) {
      return { success: false, error: permCheck.error, errorKey: 'err_permission_denied' };
    }

    // 4. driveFileId로 Google Drive 파일 접근
    const driveFileId = fileRecord.DriveFileID;

    // 5. 다운로드 URL 생성
    const downloadUrl = 'https://drive.google.com/uc?export=download&id=' + driveFileId;

    // 6. 감사 로그 기록 (파일 다운로드)
    _saveAuditLog('FILE', 'Download', fileRecord.StudentID, {
      fileId: fileId,
      fileName: fileRecord.FileName
    });

    // 7. 결과 반환
    return {
      success: true,
      data: {
        fileId: fileId,
        fileName: fileRecord.FileName,
        downloadUrl: downloadUrl
      }
    };

  } catch (e) {
    _saveAuditLog('FILE', 'DownloadError', '', { fileId: fileId, error: e.message });
    return { success: false, error: e.message, errorKey: 'err_file_download_failed' };
  }
}

/**
 * 파일 삭제 (Google Drive + Files 시트)
 * @param {string} fileId - 파일 ID
 * @returns {Object} { success, data: { fileId, deletedAt }, error }
 */
function deleteFile(fileId) {
  try {
    // 1. 세션 검증
    const sessionId = _getSessionIdFromRequest();
    const session = _validateSession(sessionId);
    if (!session) {
      return { success: false, error: 'Invalid session', errorKey: 'err_session_invalid' };
    }

    // 2. 권한 검증 (master/agency만 가능)
    if (session.role !== 'master' && session.role !== 'agency') {
      return { success: false, error: 'Permission denied', errorKey: 'err_permission_denied' };
    }

    // 3. Files 시트에서 fileId 조회
    const allFiles = _getAllRows(SHEETS.FILES);
    const fileRecord = allFiles.find(file => file.FileID === fileId);

    if (!fileRecord) {
      return { success: false, error: 'File not found', errorKey: 'err_file_not_found' };
    }

    // Agency는 본인 학생만 삭제 가능
    if (session.role === 'agency') {
      const permCheck = _validatePermission(session, 'DELETE', SHEETS.FILES, fileRecord.StudentID);
      if (!permCheck.success) {
        return { success: false, error: permCheck.error, errorKey: 'err_permission_denied' };
      }
    }

    // 4. driveFileId로 Google Drive 파일 삭제
    try {
      const driveFile = DriveApp.getFileById(fileRecord.DriveFileID);
      driveFile.setTrashed(true);
    } catch (e) {
      // Drive 파일이 이미 삭제되었거나 접근 불가한 경우 무시
      Logger.log('Drive file deletion failed: ' + e.message);
    }

    // 5. Files 시트에서 행 삭제
    const deleteSuccess = _hardDeleteRow(SHEETS.FILES, 'FileID', fileId);

    if (!deleteSuccess) {
      return { success: false, error: 'Failed to delete file record', errorKey: 'err_file_delete_failed' };
    }

    const deletedAt = getCurrentTimestamp();

    // 6. 감사 로그 기록
    _saveAuditLog('FILE', 'Delete', fileRecord.StudentID, {
      fileId: fileId,
      fileName: fileRecord.FileName
    });

    // 7. 결과 반환
    return {
      success: true,
      data: {
        fileId: fileId,
        deletedAt: deletedAt
      }
    };

  } catch (e) {
    _saveAuditLog('FILE', 'DeleteError', '', { fileId: fileId, error: e.message });
    return { success: false, error: e.message, errorKey: 'err_file_delete_failed' };
  }
}

/**
 * 이미지 파일 썸네일 URL 반환
 * @param {string} fileId - 파일 ID
 * @returns {Object} { success, data: { fileId, thumbnailUrl, fullSizeUrl }, error }
 */
function getFileThumbnail(fileId) {
  try {
    // 1. 세션 검증
    const sessionId = _getSessionIdFromRequest();
    const session = _validateSession(sessionId);
    if (!session) {
      return { success: false, error: 'Invalid session', errorKey: 'err_session_invalid' };
    }

    // 3. Files 시트에서 fileId 조회
    const allFiles = _getAllRows(SHEETS.FILES);
    const fileRecord = allFiles.find(file => file.FileID === fileId);

    if (!fileRecord) {
      return { success: false, error: 'File not found', errorKey: 'err_file_not_found' };
    }

    // 2. 권한 검증
    const permCheck = _validatePermission(session, 'READ', SHEETS.FILES, fileRecord.StudentID);
    if (!permCheck.success) {
      return { success: false, error: permCheck.error, errorKey: 'err_permission_denied' };
    }

    // 4. mimeType 확인 (image/jpeg, image/png만 가능)
    if (!fileRecord.MimeType || !fileRecord.MimeType.startsWith('image/')) {
      return { success: false, error: 'File is not an image', errorKey: 'err_file_not_image' };
    }

    // 5. Google Drive API로 썸네일 생성 (200x200px)
    const driveFileId = fileRecord.DriveFileID;
    const thumbnailUrl = 'https://drive.google.com/thumbnail?id=' + driveFileId + '&sz=w200-h200';
    const fullSizeUrl = 'https://drive.google.com/file/d/' + driveFileId + '/view';

    // 6. 결과 반환
    return {
      success: true,
      data: {
        fileId: fileId,
        thumbnailUrl: thumbnailUrl,
        fullSizeUrl: fullSizeUrl
      }
    };

  } catch (e) {
    return { success: false, error: e.message, errorKey: 'err_file_thumbnail_failed' };
  }
}

// ============================================================
// Private Helper Functions
// ============================================================

/**
 * 파일 업로드 유효성 검사
 * @param {Object} file - { name, mimeType, content }
 * @returns {Object} { success, error, errorKey }
 */
function _validateFileUpload(file) {
  if (!file || !file.name || !file.mimeType || !file.content) {
    return { success: false, error: 'Invalid file object', errorKey: 'err_file_invalid' };
  }

  // 파일 형식 검사
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'application/pdf'
  ];

  if (!allowedTypes.includes(file.mimeType)) {
    return { success: false, error: 'Invalid file format', errorKey: 'err_file_invalid_format' };
  }

  // 파일 크기 검사
  const blob = Utilities.newBlob(file.content, file.mimeType, file.name);
  const fileSize = blob.getBytes().length;

  const maxSize = file.mimeType.startsWith('image/') ? 10 * 1024 * 1024 : 50 * 1024 * 1024; // 10MB for images, 50MB for PDFs

  if (fileSize > maxSize) {
    return { success: false, error: 'File size exceeded', errorKey: 'err_file_size_exceeded' };
  }

  return { success: true };
}

/**
 * 학생 파일 폴더 가져오기 또는 생성
 * @param {string} studentId - 학생 ID
 * @param {string} category - 카테고리
 * @returns {Folder} Google Drive Folder 객체
 */
function _getOrCreateStudentFolder(studentId, category) {
  // Root 폴더: "StudentFiles"
  const rootFolders = DriveApp.getFoldersByName('StudentFiles');
  let rootFolder;

  if (rootFolders.hasNext()) {
    rootFolder = rootFolders.next();
  } else {
    rootFolder = DriveApp.createFolder('StudentFiles');
  }

  // 학생 폴더: "StudentFiles/{studentId}"
  const studentFolders = rootFolder.getFoldersByName(studentId);
  let studentFolder;

  if (studentFolders.hasNext()) {
    studentFolder = studentFolders.next();
  } else {
    studentFolder = rootFolder.createFolder(studentId);
  }

  // 카테고리 폴더: "StudentFiles/{studentId}/{category}"
  const categoryFolders = studentFolder.getFoldersByName(category);
  let categoryFolder;

  if (categoryFolders.hasNext()) {
    categoryFolder = categoryFolders.next();
  } else {
    categoryFolder = studentFolder.createFolder(category);
  }

  return categoryFolder;
}

/**
 * 요청에서 세션 ID 가져오기 (임시 구현)
 * @returns {string} 세션 ID
 */
function _getSessionIdFromRequest() {
  // TODO: 실제 구현 시 HTTP 요청 헤더 또는 파라미터에서 가져오기
  // 현재는 Auth.gs의 getCurrentSession() 사용
  const currentSession = getCurrentSession();
  return currentSession ? currentSession.sessionId : '';
}
