/**
 * =====================================================
 * SATYAM MALL INVENTORY - GOOGLE APPS SCRIPT
 * =====================================================
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete all existing code
 * 4. Copy-paste this entire code
 * 5. Click "Run" > "setupSheets" (first time only)
 * 6. Click "Run" > "authorizeDrive" (to enable file uploads)
 * 7. Authorize the script when prompted
 * 8. Deploy > New Deployment > Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 9. Copy the Web App URL and paste in app Settings
 *
 * =====================================================
 */

// ==================== AUTHORIZE DRIVE ====================
// Run this function ONCE to grant Drive permissions
function authorizeDrive() {
  const testFolder = DriveApp.getRootFolder();
  SpreadsheetApp.getUi().alert(
    'Drive Authorized!',
    'Google Drive access granted successfully.\n\nNow redeploy your Web App:\n1. Deploy > Manage Deployments\n2. Click pencil icon\n3. Select New Version\n4. Click Deploy',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ==================== SETUP FUNCTION ====================
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // -------- Create Users Sheet --------
  let usersSheet = ss.getSheetByName('Users');
  if (!usersSheet) {
    usersSheet = ss.insertSheet('Users');
  } else {
    usersSheet.clear();
  }

  const usersHeaders = ['Email', 'Password', 'Name', 'Role', 'Status', 'CreatedAt'];
  usersSheet.getRange(1, 1, 1, usersHeaders.length).setValues([usersHeaders]);
  usersSheet.getRange(1, 1, 1, usersHeaders.length).setFontWeight('bold').setBackground('#4f46e5').setFontColor('white');

  // Add default admin user
  const defaultAdmin = ['admin@satyammall.com', 'admin123', 'Administrator', 'Admin', 'Active', new Date()];
  usersSheet.getRange(2, 1, 1, defaultAdmin.length).setValues([defaultAdmin]);

  usersSheet.setColumnWidth(1, 200);  // Email
  usersSheet.setColumnWidth(2, 120);  // Password
  usersSheet.setColumnWidth(3, 150);  // Name
  usersSheet.setColumnWidth(4, 100);  // Role
  usersSheet.setColumnWidth(5, 80);   // Status
  usersSheet.setColumnWidth(6, 150);  // CreatedAt

  // -------- Create Inventory Sheet --------
  let invSheet = ss.getSheetByName('Inventory');
  if (!invSheet) {
    invSheet = ss.insertSheet('Inventory');
  } else {
    invSheet.clear();
  }

  const invHeaders = ['ID', 'Name', 'Category', 'Quantity', 'Unit', 'MinLevel'];
  invSheet.getRange(1, 1, 1, invHeaders.length).setValues([invHeaders]);
  invSheet.getRange(1, 1, 1, invHeaders.length).setFontWeight('bold').setBackground('#059669').setFontColor('white');

  invSheet.setColumnWidth(1, 50);
  invSheet.setColumnWidth(2, 200);
  invSheet.setColumnWidth(3, 120);
  invSheet.setColumnWidth(4, 80);
  invSheet.setColumnWidth(5, 80);
  invSheet.setColumnWidth(6, 80);

  // -------- Create Transactions Sheet --------
  let transSheet = ss.getSheetByName('Transactions');
  if (!transSheet) {
    transSheet = ss.insertSheet('Transactions');
  } else {
    transSheet.clear();
  }

  const transHeaders = ['Date', 'Type', 'ItemName', 'Quantity', 'Unit', 'Location', 'PersonName', 'Notes', 'FileURL'];
  transSheet.getRange(1, 1, 1, transHeaders.length).setValues([transHeaders]);
  transSheet.getRange(1, 1, 1, transHeaders.length).setFontWeight('bold').setBackground('#d97706').setFontColor('white');

  transSheet.setColumnWidth(1, 150);
  transSheet.setColumnWidth(2, 80);
  transSheet.setColumnWidth(3, 200);
  transSheet.setColumnWidth(4, 80);
  transSheet.setColumnWidth(5, 80);
  transSheet.setColumnWidth(6, 120);
  transSheet.setColumnWidth(7, 150);
  transSheet.setColumnWidth(8, 200);
  transSheet.setColumnWidth(9, 250);

  transSheet.getRange('A:A').setNumberFormat('dd-mmm-yyyy hh:mm');

  // Delete default Sheet1
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1) {
    ss.deleteSheet(sheet1);
  }

  SpreadsheetApp.getUi().alert(
    'Setup Complete!',
    'Created sheets: Users, Inventory, Transactions\n\nDefault Admin:\nEmail: admin@satyammall.com\nPassword: admin123\n\nYou can add more users in the Users sheet.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}


// ==================== API FUNCTIONS ====================

function doGet(e) {
  try {
    const sheetName = e.parameter.sheet || 'Inventory';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return createJsonResponse({ error: 'Sheet not found: ' + sheetName });
    }

    const data = sheet.getDataRange().getValues();
    if (data.length === 0) return createJsonResponse([]);

    const headers = data[0].map(h => String(h).toLowerCase().replace(/\s+/g, ''));
    const rows = data.slice(1);

    const result = rows.map((row, index) => {
      const obj = {};
      headers.forEach((header, i) => {
        let value = row[i];
        if (value instanceof Date) value = value.toISOString();
        obj[header] = value;
      });
      obj._rowIndex = index + 2;
      return obj;
    });

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ error: error.toString() });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // -------- User Login --------
    if (body.action === 'login') {
      const usersSheet = ss.getSheetByName('Users');
      if (!usersSheet) {
        return createJsonResponse({ status: 'error', message: 'Users sheet not found. Run setupSheets first.' });
      }

      const data = usersSheet.getDataRange().getValues();
      const email = String(body.email).trim().toLowerCase();
      const password = String(body.password).trim();

      for (let i = 1; i < data.length; i++) {
        const userEmail = String(data[i][0]).trim().toLowerCase();
        const userPassword = String(data[i][1]).trim();
        const userName = String(data[i][2]).trim();
        const userRole = String(data[i][3]).trim();
        const userStatus = String(data[i][4]).trim();

        if (userEmail === email && userPassword === password) {
          if (userStatus.toLowerCase() !== 'active') {
            return createJsonResponse({ status: 'error', message: 'Account is inactive. Contact admin.' });
          }
          return createJsonResponse({
            status: 'success',
            user: {
              email: userEmail,
              name: userName,
              role: userRole
            }
          });
        }
      }

      return createJsonResponse({ status: 'error', message: 'Invalid email or password' });
    }

    // -------- Add User --------
    if (body.action === 'addUser') {
      const usersSheet = ss.getSheetByName('Users');
      if (!usersSheet) {
        return createJsonResponse({ status: 'error', message: 'Users sheet not found' });
      }

      // Check if email already exists
      const data = usersSheet.getDataRange().getValues();
      const newEmail = String(body.email).trim().toLowerCase();

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toLowerCase() === newEmail) {
          return createJsonResponse({ status: 'error', message: 'Email already exists' });
        }
      }

      const newUser = [
        body.email,
        body.password,
        body.name || '',
        body.role || 'Staff',
        'Active',
        new Date()
      ];
      usersSheet.appendRow(newUser);
      return createJsonResponse({ status: 'success', message: 'User created successfully' });
    }

    // -------- Get All Users --------
    if (body.action === 'getUsers') {
      const usersSheet = ss.getSheetByName('Users');
      if (!usersSheet) {
        return createJsonResponse({ status: 'error', message: 'Users sheet not found' });
      }

      const data = usersSheet.getDataRange().getValues();
      const users = [];

      for (let i = 1; i < data.length; i++) {
        users.push({
          email: data[i][0],
          name: data[i][2],
          role: data[i][3],
          status: data[i][4],
          createdAt: data[i][5]
        });
      }

      return createJsonResponse({ status: 'success', users: users });
    }

    // -------- Update User --------
    if (body.action === 'updateUser') {
      const usersSheet = ss.getSheetByName('Users');
      if (!usersSheet) {
        return createJsonResponse({ status: 'error', message: 'Users sheet not found' });
      }

      const data = usersSheet.getDataRange().getValues();
      const targetEmail = String(body.email).trim().toLowerCase();

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toLowerCase() === targetEmail) {
          if (body.name) usersSheet.getRange(i + 1, 3).setValue(body.name);
          if (body.role) usersSheet.getRange(i + 1, 4).setValue(body.role);
          if (body.status) usersSheet.getRange(i + 1, 5).setValue(body.status);
          if (body.password) usersSheet.getRange(i + 1, 2).setValue(body.password);
          return createJsonResponse({ status: 'success', message: 'User updated successfully' });
        }
      }

      return createJsonResponse({ status: 'error', message: 'User not found' });
    }

    // -------- Delete User --------
    if (body.action === 'deleteUser') {
      const usersSheet = ss.getSheetByName('Users');
      if (!usersSheet) {
        return createJsonResponse({ status: 'error', message: 'Users sheet not found' });
      }

      const data = usersSheet.getDataRange().getValues();
      const targetEmail = String(body.email).trim().toLowerCase();

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toLowerCase() === targetEmail) {
          usersSheet.deleteRow(i + 1);
          return createJsonResponse({ status: 'success', message: 'User deleted successfully' });
        }
      }

      return createJsonResponse({ status: 'error', message: 'User not found' });
    }

    // -------- Add Transaction --------
    if (body.action === 'addTransaction') {
      const tSheet = ss.getSheetByName('Transactions');
      const iSheet = ss.getSheetByName('Inventory');

      if (!tSheet || !iSheet) {
        return createJsonResponse({ status: 'error', message: 'Sheets not found. Run setupSheets first.' });
      }

      const transactionRow = [
        new Date(),
        body.type || '',
        body.itemName || '',
        Number(body.quantity) || 0,
        body.unit || '',
        body.location || '',
        body.personName || '',
        body.notes || '',
        body.fileUrl || ''
      ];
      tSheet.appendRow(transactionRow);

      const invData = iSheet.getDataRange().getValues();
      let itemFound = false;

      for (let i = 1; i < invData.length; i++) {
        const itemName = String(invData[i][1]).trim().toLowerCase();
        const searchName = String(body.itemName).trim().toLowerCase();

        if (itemName === searchName) {
          const currentQty = Number(invData[i][3]) || 0;
          const changeQty = Number(body.quantity) || 0;
          let newQty = body.type === 'RECEIVE' ? currentQty + changeQty : currentQty - changeQty;
          if (newQty < 0) newQty = 0;
          iSheet.getRange(i + 1, 4).setValue(newQty);
          itemFound = true;
          break;
        }
      }

      if (!itemFound && body.type === 'RECEIVE') {
        const newId = invData.length;
        const newRow = [newId, body.itemName, body.category || 'Others', Number(body.quantity) || 0, body.unit || 'pcs', Number(body.minLevel) || 5];
        iSheet.appendRow(newRow);
      }

      return createJsonResponse({ status: 'success', message: 'Transaction recorded' });
    }

    // -------- Update Inventory --------
    if (body.action === 'updateInventory') {
      const iSheet = ss.getSheetByName('Inventory');
      if (!iSheet) return createJsonResponse({ status: 'error', message: 'Inventory sheet not found' });

      const data = iSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][1]).trim().toLowerCase() === String(body.itemName).trim().toLowerCase()) {
          iSheet.getRange(i + 1, 4).setValue(Number(body.newQuantity));
          return createJsonResponse({ status: 'success', message: 'Quantity updated' });
        }
      }
      return createJsonResponse({ status: 'error', message: 'Item not found' });
    }

    // -------- Upload File --------
    if (body.action === 'uploadFile') {
      try {
        const fileName = body.fileName || 'upload_' + Date.now();
        const mimeType = body.mimeType || 'application/octet-stream';
        const fileData = body.fileData;

        if (!fileData) return createJsonResponse({ status: 'error', message: 'No file data' });

        const decodedData = Utilities.base64Decode(fileData);
        const blob = Utilities.newBlob(decodedData, mimeType, fileName);

        // Get or create Inventory Uploads folder
        let folder;
        const folderName = 'Satyam Mall Inventory Uploads';
        const folders = DriveApp.getFoldersByName(folderName);
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder(folderName);
        }

        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

        return createJsonResponse({
          status: 'success',
          fileUrl: file.getUrl(),
          fileId: file.getId()
        });
      } catch (uploadError) {
        return createJsonResponse({ status: 'error', message: 'Upload failed: ' + uploadError.toString() });
      }
    }

    return createJsonResponse({ status: 'error', message: 'Unknown action: ' + body.action });

  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
