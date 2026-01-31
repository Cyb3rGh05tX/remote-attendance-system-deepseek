// Google Apps Script Code - Deploy as Web App
const SHEET_ID = '1ConJtx18byb76WuyipjC6jn4MjzuG24Tkw5CjBsPe38'; // Replace with your Sheet ID

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const action = e.parameter.action;
  
  try {
    let result;
    
    switch(action) {
      case 'login':
        result = handleLogin(e.parameter.userId);
        break;
      case 'checkIn':
        result = handleCheckIn(e.parameter.userId, e.parameter.name);
        break;
      case 'checkOut':
        result = handleCheckOut(e.parameter.userId);
        break;
      case 'getAttendance':
        result = getEmployeeAttendance(e.parameter.userId, e.parameter.period);
        break;
      case 'getAllAttendance':
        result = getAllAttendance(e.parameter.period);
        break;
      case 'addTask':
        result = addTask(e.parameter.userId, e.parameter.name, e.parameter.taskTitle, e.parameter.status);
        break;
      case 'updateTask':
        result = updateTask(e.parameter.taskId, e.parameter.status);
        break;
      case 'getTasks':
        result = getEmployeeTasks(e.parameter.userId);
        break;
      case 'getAllTasks':
        result = getAllTasks();
        break;
      case 'exportData':
        result = exportData(e.parameter.dataType);
        break;
      default:
        result = { success: false, message: 'Invalid action' };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        message: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Initialize sheets
function initSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // Create sheets if they don't exist
  const sheets = ['Users', 'Attendance', 'Tasks'];
  sheets.forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      
      // Set headers based on sheet type
      if (sheetName === 'Users') {
        sheet.getRange('A1:D1').setValues([['UserID', 'Name', 'Password', 'Role']]);
        // Add sample users
        sheet.getRange('A2:D4').setValues([
          ['EMP001', 'John Doe', 'password123', 'employee'],
          ['EMP002', 'Jane Smith', 'password123', 'employee'],
          ['ADM001', 'Admin User', 'admin123', 'admin']
        ]);
      } else if (sheetName === 'Attendance') {
        sheet.getRange('A1:E1').setValues([['UserID', 'Name', 'Date', 'CheckIn', 'CheckOut']]);
      } else if (sheetName === 'Tasks') {
        sheet.getRange('A1:F1').setValues([['TaskID', 'UserID', 'Name', 'TaskTitle', 'Status', 'LastUpdated']]);
      }
    }
  });
  
  return ss;
}

function handleLogin(userId) {
  const ss = initSheets();
  const usersSheet = ss.getSheetByName('Users');
  const data = usersSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      return {
        success: true,
        user: {
          userId: data[i][0],
          name: data[i][1],
          role: data[i][3]
        }
      };
    }
  }
  
  return { success: false, message: 'User not found' };
}

function handleCheckIn(userId, name) {
  const ss = initSheets();
  const attendanceSheet = ss.getSheetByName('Attendance');
  const data = attendanceSheet.getDataRange().getValues();
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  
  // Check if already checked in today
  for (let i = 1; i < data.length; i++) {
    const recordDate = new Date(data[i][2]).toISOString().split('T')[0];
    if (data[i][0] === userId && recordDate === today && data[i][3]) {
      return { 
        success: false, 
        message: 'Already checked in today' 
      };
    }
  }
  
  // Add new attendance record
  const newRow = [
    userId,
    name,
    today,
    now,
    '' // CheckOut empty
  ];
  
  attendanceSheet.appendRow(newRow);
  
  return { 
    success: true, 
    message: 'Checked in successfully',
    time: now 
  };
}

function handleCheckOut(userId) {
  const ss = initSheets();
  const attendanceSheet = ss.getSheetByName('Attendance');
  const data = attendanceSheet.getDataRange().getValues();
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  
  // Find today's check-in
  for (let i = 1; i < data.length; i++) {
    const recordDate = new Date(data[i][2]).toISOString().split('T')[0];
    if (data[i][0] === userId && recordDate === today) {
      if (data[i][4]) {
        return { 
          success: false, 
          message: 'Already checked out today' 
        };
      }
      
      // Update checkout time
      attendanceSheet.getRange(i + 1, 5).setValue(now);
      
      return { 
        success: true, 
        message: 'Checked out successfully',
        time: now 
      };
    }
  }
  
  return { 
    success: false, 
    message: 'No check-in found for today' 
  };
}

function getEmployeeAttendance(userId, period = 'daily') {
  const ss = initSheets();
  const attendanceSheet = ss.getSheetByName('Attendance');
  const data = attendanceSheet.getDataRange().getValues();
  const now = new Date();
  const result = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      const recordDate = new Date(data[i][2]);
      
      // Filter by period
      if (period === 'daily' && 
          recordDate.toDateString() !== now.toDateString()) continue;
      if (period === 'weekly') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        if (recordDate < weekStart) continue;
      }
      if (period === 'monthly' && 
          recordDate.getMonth() !== now.getMonth()) continue;
      
      result.push({
        userId: data[i][0],
        name: data[i][1],
        date: data[i][2],
        checkIn: data[i][3],
        checkOut: data[i][4]
      });
    }
  }
  
  return { success: true, data: result };
}

function getAllAttendance(period = 'daily') {
  const ss = initSheets();
  const attendanceSheet = ss.getSheetByName('Attendance');
  const data = attendanceSheet.getDataRange().getValues();
  const now = new Date();
  const result = [];
  
  for (let i = 1; i < data.length; i++) {
    const recordDate = new Date(data[i][2]);
    
    // Filter by period
    if (period === 'daily' && 
        recordDate.toDateString() !== now.toDateString()) continue;
    if (period === 'weekly') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      if (recordDate < weekStart) continue;
    }
    if (period === 'monthly' && 
        recordDate.getMonth() !== now.getMonth()) continue;
    
    result.push({
      userId: data[i][0],
      name: data[i][1],
      date: data[i][2],
      checkIn: data[i][3],
      checkOut: data[i][4]
    });
  }
  
  return { success: true, data: result };
}

function addTask(userId, name, taskTitle, status) {
  const ss = initSheets();
  const tasksSheet = ss.getSheetByName('Tasks');
  const taskId = 'TASK' + Date.now();
  const now = new Date().toISOString();
  
  const newRow = [
    taskId,
    userId,
    name,
    taskTitle,
    status || 'Not Started',
    now
  ];
  
  tasksSheet.appendRow(newRow);
  
  return { 
    success: true, 
    message: 'Task added successfully',
    taskId: taskId,
    time: now 
  };
}

function updateTask(taskId, status) {
  const ss = initSheets();
  const tasksSheet = ss.getSheetByName('Tasks');
  const data = tasksSheet.getDataRange().getValues();
  const now = new Date().toISOString();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === taskId) {
      tasksSheet.getRange(i + 1, 5).setValue(status);
      tasksSheet.getRange(i + 1, 6).setValue(now);
      
      return { 
        success: true, 
        message: 'Task updated successfully',
        time: now 
      };
    }
  }
  
  return { success: false, message: 'Task not found' };
}

function getEmployeeTasks(userId) {
  const ss = initSheets();
  const tasksSheet = ss.getSheetByName('Tasks');
  const data = tasksSheet.getDataRange().getValues();
  const result = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === userId) {
      result.push({
        taskId: data[i][0],
        userId: data[i][1],
        name: data[i][2],
        taskTitle: data[i][3],
        status: data[i][4],
        lastUpdated: data[i][5]
      });
    }
  }
  
  return { success: true, data: result };
}

function getAllTasks() {
  const ss = initSheets();
  const tasksSheet = ss.getSheetByName('Tasks');
  const data = tasksSheet.getDataRange().getValues();
  const result = [];
  
  for (let i = 1; i < data.length; i++) {
    result.push({
      taskId: data[i][0],
      userId: data[i][1],
      name: data[i][2],
      taskTitle: data[i][3],
      status: data[i][4],
      lastUpdated: data[i][5]
    });
  }
  
  return { success: true, data: result };
}

function exportData(dataType) {
  const ss = initSheets();
  let sheet;
  let filename;
  
  if (dataType === 'attendance') {
    sheet = ss.getSheetByName('Attendance');
    filename = 'attendance_export_' + new Date().toISOString().split('T')[0] + '.csv';
  } else if (dataType === 'tasks') {
    sheet = ss.getSheetByName('Tasks');
    filename = 'tasks_export_' + new Date().toISOString().split('T')[0] + '.csv';
  } else {
    return { success: false, message: 'Invalid data type' };
  }
  
  const data = sheet.getDataRange().getValues();
  const csv = data.map(row => row.join(',')).join('\n');
  
  return {
    success: true,
    filename: filename,
    csv: csv
  };
}
