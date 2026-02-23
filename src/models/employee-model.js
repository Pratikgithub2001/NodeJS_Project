import db from "../../config/db.js"; 
const connection = db.callback;
const pool = db.promise;

export const EmployeeModel = {
    list: (params, callback) => {
        console.log('* CB-API * Employee.list Model Start ...');
        const { organization_id, is_blocked, status, is_manager, rule, emp_no, employee_type, posting_location, state_code } = params;

        let whereCondition = `1 AND e.organization_id_fk = ${connection.escape(organization_id)}`;

        if (is_blocked !== undefined && is_blocked !== '') {
            whereCondition += ` AND e.isblocked = ${connection.escape(is_blocked)}`;
        }

        if (status) {
            if (['1', '2', '3', '4'].includes(status.toString())) {
                whereCondition += ` AND e.status = ${connection.escape(status)}`;
            }
        } else {
            whereCondition += " AND e.status IN (1, 2, 3, 4)";
        }

        if (is_manager) whereCondition += " AND e.is_manager = 1";
        if (rule) whereCondition += ` AND erm.rule_code = ${connection.escape(rule)}`;
        if (emp_no) whereCondition += ` AND e.emp_no = ${connection.escape(emp_no)}`;
        if (employee_type) whereCondition += ` AND e.employee_type = ${connection.escape(employee_type)}`;

        const finalizeQuery = (finalWhere) => {
            const mainQuery = `
        SELECT e.id, e.emp_no, UPPER(CONCAT(e.fname, ' ', e.mname, ' ', e.lname)) as name,
            e.fname, e.mname, e.lname, e.mobile, e.email, e.aadhaar_no, e.gender, DATE_FORMAT(e.dob, '%Y-%m-%d') as dob,
            e.blood_group, e.address_current, e.is_manager, e.address_permanent,
            e.emerg_contact_name, e.emerg_contact_number, e.emerg_contact_relation,e.employee_type,
            DATE_FORMAT(e.date_of_joining, '%Y-%m-%d') as date_of_joining, DATE_FORMAT(e.probation_period_end_date, '%Y-%m-%d') as probation_period_end_date, e.email_office, e.shift, ott.shift_name, DATE_FORMAT(e.date_of_leaving, '%Y-%m-%d') as date_of_leaving,
            e.manager_empid, e.isblocked, e.status, e.is_debug_on, e.is_reg_image_approved,
            cl.name as office_location, GROUP_CONCAT(DISTINCT erm.rule_code) AS rule_code,
            o.name as org_name, o.code as org_code,
            UPPER(CONCAT(em.fname, ' ', em.mname, ' ', em.lname)) as manager_name,
            omd.value as department_name, omdes.value as designation_name,
            e.posting_location as posting_location_name, 
            omp_loc.state as posting_state, e.uan_no, e.esic_no,
            e.bank_name, e.bank_accnt_no, e.bank_branch, e.bank_ifsc, e.created_by, DATE_FORMAT(e.create_datetime, '%Y-%m-%d %H:%i:%s') as create_datetime
        FROM employee e
        LEFT JOIN employee_location_mapping elm ON e.id = elm.employee_id_fk
        LEFT JOIN employee_location cl ON elm.location_code = cl.location_code
        LEFT JOIN employee_rule_mapping erm ON e.id = erm.employee_id_fk
        LEFT JOIN organization o ON o.id = e.organization_id_fk
        LEFT JOIN employee em ON e.manager_empid = em.emp_no
        LEFT JOIN organization_time_table ott ON CONVERT(ott.shift_code USING utf8mb4) = CONVERT(e.shift USING utf8mb4) AND e.organization_id_fk = ott.organization_id_fk 
        LEFT JOIN organization_master_department omd ON omd.code = e.department_code
        LEFT JOIN organization_master_designation omdes ON omdes.id = e.designation_id_fk
        LEFT JOIN organization_master_posting omp_loc ON omp_loc.value = e.posting_location AND omp_loc.organization_id_fk = e.organization_id_fk
        WHERE ${finalWhere} AND e.is_deleted = 'N'
        GROUP BY e.id
      `;

            connection.query(mainQuery, (err, results) => {
                if (err) return callback(err);

                // Sub-queries for counts and missing info
                const countQuery = `SELECT COUNT(CASE WHEN (e.aadhaar_no IS NULL OR e.aadhaar_no = '') THEN 1 END) AS aadhaar_not_assigned_count FROM employee e WHERE e.organization_id_fk = ${connection.escape(organization_id)} AND e.status = 1`;

                connection.query(countQuery, (err, countRes) => {
                    if (err) return callback(err);

                    const aadhaarMissingQuery = `SELECT e.emp_no FROM employee e WHERE (e.aadhaar_no IS NULL OR e.aadhaar_no = '') AND ${finalWhere}`;

                    connection.query(aadhaarMissingQuery, (err, aadhaarMissing) => {
                        if (err) return callback(err);

                        const locMissingQuery = `SELECT e.emp_no FROM employee e WHERE (e.posting_location IS NULL OR e.posting_location = '' OR e.posting_location = ' ') AND ${finalWhere}`;

                        connection.query(locMissingQuery, (err, locMissing) => {
                            if (err) return callback(err);

                            callback(null, {
                                results,
                                aadhaar_not_assigned_count: countRes[0].aadhaar_not_assigned_count,
                                aadhaar_missing: aadhaarMissing.map(r => r.emp_no),
                                loc_missing: locMissing.map(r => r.emp_no)
                            });
                        });
                    });
                });
            });
        };

        if (posting_location === 'N') {
            finalizeQuery(whereCondition + " AND 1=0");
        } else if (posting_location === 'A' || !posting_location) {
            if (state_code) {
                const stateLocQuery = `SELECT value AS location_name FROM organization_master_posting WHERE state = ${connection.escape(state_code)} AND organization_id_fk = ${connection.escape(organization_id)}`;
                connection.query(stateLocQuery, (err, locations) => {
                    if (err) return callback(err);
                    if (locations.length > 0) {
                        const locList = locations.map(l => connection.escape(l.location_name)).join(',');
                        finalizeQuery(whereCondition + ` AND e.posting_location IN (${locList})`);
                    } else {
                        finalizeQuery(whereCondition + " AND 1=0");
                    }
                });
            } else {
                finalizeQuery(whereCondition);
            }
        } else {
            finalizeQuery(whereCondition + ` AND e.posting_location = ${connection.escape(posting_location)}`);
        }
    },

    view: (emp_id, callback) => {
        console.log('* CB-API * Employee.view Model Start ...');
        const query = `
      SELECT e.id, e.emp_no, UPPER(CONCAT(e.fname, ' ', e.mname, ' ', e.lname)) as name,
          e.fname, e.mname, e.lname, e.mobile, e.email, e.aadhaar_no, e.gender, DATE_FORMAT(e.dob, '%Y-%m-%d') as dob,
          e.blood_group, e.address_current, e.is_manager, e.address_permanent,e.employee_type,
          e.emerg_contact_name, e.emerg_contact_number, e.emerg_contact_relation,e.religion,
          omd.value as department, DATE_FORMAT(e.date_of_joining, '%Y-%m-%d') as date_of_joining, e.email_office, e.shift, e.level_code, DATE_FORMAT(e.probation_period_end_date, '%Y-%m-%d') as probation_period_end_date, e.posting_location,DATE_FORMAT(e.upload_datetime, '%Y-%m-%d %H:%i:%s') as upload_datetime,
          e.manager_empid, e.isblocked, e.status, e.is_debug_on, e.is_reg_image_approved, elm.location_code,
          cl.name as office_location, GROUP_CONCAT(DISTINCT erm.rule_code) AS rule_code,e.is_4th_saturday_allowed,
          GROUP_CONCAT(DISTINCT cm.name) AS rule_name, o.name as org_name, o.code as org_code,
          UPPER(CONCAT(em.fname, ' ', em.mname, ' ', em.lname)) as manager_name,
          em.email as manager_personal_email, em.email_office as manager_office_email, em.mobile as manager_contact_number,
          ott.in_time as office_in_time, ott.out_time as office_out_time,
          ott.in_grace_time, e.department_code, e.designation_id_fk,
          e.uan_no, e.pan_no, e.esic_no, e.bank_name, e.bank_accnt_no, e.bank_branch, e.bank_ifsc, omdes.value as designation_name, ott.shift_name, oml.max_salary, oml.min_salary,
          DATE_FORMAT(e.update_datetime, '%Y-%m-%d %H:%i:%s') as update_datetime, UPPER(CONCAT(eup.fname,' ',eup.mname,' ',eup.lname)) as updated_by,e.date_of_leaving,   omp.state AS posting_state,
          CASE 
          WHEN (
              SELECT ecl.type_of_change
              FROM employee_change_log ecl
              WHERE ecl.employee_id_fk = e.id
              ORDER BY ecl.create_datetime DESC
              LIMIT 1
          ) = 'ACTIVATE_EMPLOYMENT'
          THEN ''
          ELSE (
              SELECT ecl.reason_of_change
              FROM employee_change_log ecl
              WHERE ecl.employee_id_fk = e.id
              AND ecl.type_of_change = 'DEACTIVATE_EMPLOYMENT'
              ORDER BY ecl.create_datetime DESC
              LIMIT 1
          )
      END AS deactivation_reason
      FROM employee e
      left join employee eup on eup.emp_no = e.updated_by
      LEFT JOIN employee_location_mapping elm ON e.id = elm.employee_id_fk
      LEFT JOIN employee_location cl ON elm.location_code = cl.location_code
      LEFT JOIN employee_rule_mapping erm ON e.id = erm.employee_id_fk
      LEFT JOIN config_master cm ON cm.id = erm.rule_id_fk
      LEFT JOIN organization_master_designation omdes ON omdes.id = e.designation_id_fk
      LEFT JOIN organization o ON o.id = e.organization_id_fk
      LEFT JOIN organization_time_table ott ON CONVERT(ott.shift_code USING utf8mb4) = CONVERT(e.shift USING utf8mb4) AND e.organization_id_fk = ott.organization_id_fk 
      LEFT JOIN employee em ON e.manager_empid = em.emp_no
      LEFT JOIN organization_master_level oml ON oml.level_code = e.level_code and e.organization_id_fk = oml.organization_id_fk
      LEFT JOIN organization_master_department omd ON e.department_code = omd.code
      LEFT JOIN organization_master_posting omp ON omp.value = e.posting_location AND omp.organization_id_fk = e.organization_id_fk AND omp.status = 1
      WHERE e.id = ?
      GROUP BY e.id
    `;
        connection.query(query, [emp_id], callback);
    },

    add: async (data, callback) => {
        console.log('* CB-API * Employee.add Model Start ...');
        let connection;
        try {
            // Get a connection from the pool
            connection = await db.promise.getConnection();
            console.log("Starting transaction for employee:", data.emp_no);
            
            await connection.beginTransaction();

            // Run all checks
            console.log("Running duplicate checks...");
            const checks = [
                connection.query("SELECT emp_no FROM employee WHERE emp_no = ? AND organization_id_fk = ?", [data.emp_no, data.organization_id]),
                connection.query("SELECT emp_no FROM employee WHERE mobile = ? AND organization_id_fk = ?", [data.mobile, data.organization_id]),
                connection.query("SELECT emp_no FROM employee WHERE email = ? AND organization_id_fk = ?", [data.email, data.organization_id]),
                connection.query("SELECT emp_no FROM employee WHERE aadhaar_no = ? AND organization_id_fk = ?", [data.aadhaar_no, data.organization_id])
            ];

            if (data.uan_no) checks.push(connection.query("SELECT emp_no FROM employee WHERE uan_no = ? AND organization_id_fk = ?", [data.uan_no, data.organization_id]));
            if (data.esic_no) checks.push(connection.query("SELECT emp_no FROM employee WHERE esic_no = ? AND organization_id_fk = ?", [data.esic_no, data.organization_id]));
            if (data.pan_no) checks.push(connection.query("SELECT emp_no FROM employee WHERE pan_no = ? AND organization_id_fk = ?", [data.pan_no, data.organization_id]));

            const results = await Promise.all(checks);
            
            // Check for duplicates
            const checkFields = [
                { field: 'emp_no', value: data.emp_no },
                { field: 'mobile', value: data.mobile },
                { field: 'email', value: data.email },
                { field: 'aadhaar_no', value: data.aadhaar_no },
                ...(data.uan_no ? [{ field: 'uan_no', value: data.uan_no }] : []),
                ...(data.esic_no ? [{ field: 'esic_no', value: data.esic_no }] : []),
                ...(data.pan_no ? [{ field: 'pan_no', value: data.pan_no }] : [])
            ];

            for (let i = 0; i < results.length; i++) {
                const [rows] = results[i];
                if (rows.length > 0) {
                    const empNo = rows[0].emp_no;
                    const field = checkFields[i].field;
                    const value = checkFields[i].value;
                    console.log(`Duplicate found: ${field} = ${value} already exists for employee ${empNo}`);
                    await connection.rollback();
                    connection.release();
                    return callback({ 
                        customError: true, 
                        message: `${field} provided (${value}) already exists for employee ${empNo}.` 
                    });
                }
            }

            console.log("No duplicates found, inserting employee...");
            
            // Insert employee
            const now = new Date();
            const employeeData = {
                organization_id_fk: data.organization_id,
                fname: data.fname, mname: data.mname, lname: data.lname,
                blood_group: data.blood_group, mobile: data.mobile,
                aadhaar_no: data.aadhaar_no, email: data.email,
                emp_no: data.emp_no, gender: data.gender, dob: data.dob,
                shift: data.shift, address_current: data.address_current,
                address_permanent: data.address_permanent,
                emerg_contact_name: data.emerg_contact_name,
                emerg_contact_number: data.emerg_contact_number,
                emerg_contact_relation: data.emerg_contact_relation,
                date_of_joining: data.date_of_joining,
                probation_period_end_date: data.probation_period_end_date,
                email_office: data.email_office, manager_empid: data.manager_empid,
                is_manager: data.is_manager, department_code: data.department_code,
                designation_id_fk: data.designation_code, posting_location: data.posting_location,
                uan_no: data.uan_no, esic_no: data.esic_no,
                bank_name: data.bank_name, bank_accnt_no: data.bank_accnt_no,
                bank_branch: data.bank_branch, bank_ifsc: data.bank_ifsc,
                pan_no: data.pan_no, level_code: data.level_code,
                created_by: data.logedInEmpNo, create_datetime: now,
                employee_type: data.employee_type
            };

            const [result] = await connection.query("INSERT INTO employee SET ?", employeeData);
            const employeeId = result.insertId;
            console.log(`Employee inserted with ID: ${employeeId}`);

            // Insert leave master
            console.log("Inserting leave master...");
            const leaveData = {
                employee_id_fk: employeeId, organization_id_fk: data.organization_id,
                year: now.getFullYear(), cl_this_year: 0, el_this_year: 0, sl_this_year: 0, lta_this_year: 0,
                cl_taken: 0, el_taken: 0, sl_taken: 0, lta_taken: 0,
                create_datetime: now, created_by: data.logedInEmpNo
            };

            await connection.query("INSERT INTO employee_leave_master SET ?", leaveData);
            console.log("Leave master inserted");

            // Insert location mappings
            const locations = data.office_location ? data.office_location.split(',').map(l => l.trim()) : [];
            console.log(`Processing ${locations.length} locations...`);
            for (const locCode of locations) {
                const [locRows] = await connection.query("SELECT id FROM employee_location WHERE location_code = ?", [locCode]);
                if (locRows.length > 0) {
                    await connection.query(
                        "INSERT INTO employee_location_mapping (employee_id_fk, location_id_fk, location_code) VALUES (?, ?, ?)",
                        [employeeId, locRows[0].id, locCode]
                    );
                    console.log(`Location mapping added for: ${locCode}`);
                }
            }

            // Insert rule mappings
            const rules = data.rule ? data.rule.split(',').map(r => r.trim()) : [];
            console.log(`Processing ${rules.length} rules...`);
            let is4thSat = 'N';
            for (const ruleCode of rules) {
                const [ruleRows] = await connection.query("SELECT id FROM config_master WHERE code = ?", [ruleCode]);
                if (ruleRows.length > 0) {
                    if (ruleCode === '4TH_SATURDAY_APPLICABLE') is4thSat = 'Y';
                    await connection.query(
                        "INSERT INTO employee_rule_mapping (employee_id_fk, rule_id_fk, rule_code, created_by, create_datetime) VALUES (?, ?, ?, ?, ?)",
                        [employeeId, ruleRows[0].id, ruleCode, data.logedInEmpNo, now]
                    );
                    console.log(`Rule mapping added for: ${ruleCode}`);
                }
            }

            // Update employee with 4th Saturday setting
            await connection.query("UPDATE employee SET is_4th_saturday_allowed = ? WHERE id = ?", [is4thSat, employeeId]);
            console.log(`4th Saturday setting updated to: ${is4thSat}`);

            // Commit transaction
            await connection.commit();
            console.log("Transaction committed successfully");
            
            connection.release();
            callback(null, employeeId);

        } catch (err) {
            console.error("Error in add employee:", err);
            if (connection) {
                try {
                    await connection.rollback();
                    console.log("Transaction rolled back due to error");
                    connection.release();
                } catch (rollbackErr) {
                    console.error("Error during rollback:", rollbackErr);
                }
            }
            callback(err);
        }
    },

    updatePersonalDetails: async (id, data, callback) => {
        console.log('* CB-API * Employee.updatePersonalDetails Model Start ...');
        let connection;
        try {
            // Get a connection from the pool
            connection = await db.promise.getConnection();
            console.log(`[UpdatePersonalDetails] Starting transaction for employee ID: ${id}`);
            
            await connection.beginTransaction();

            // Get current employee data
            console.log(`[UpdatePersonalDetails] Fetching current data for employee ID: ${id}`);
            const [currentRows] = await connection.query("SELECT * FROM employee WHERE id = ?", [id]);
            
            if (currentRows.length === 0) {
                await connection.rollback();
                connection.release();
                return callback({ customError: true, message: "Employee not found." });
            }
            
            const curr = currentRows[0];

            // Check for unique Aadhaar if it's being changed
            if (data.aadhaar_no && data.aadhaar_no !== curr.aadhaar_no) {
                console.log(`[UpdatePersonalDetails] Checking Aadhaar uniqueness: ${data.aadhaar_no}`);
                const [aadhaarRows] = await connection.query(
                    "SELECT emp_no FROM employee WHERE aadhaar_no = ? AND organization_id_fk = ? AND id != ?",
                    [data.aadhaar_no, curr.organization_id_fk, id]
                );
                
                if (aadhaarRows.length > 0) {
                    console.log(`[UpdatePersonalDetails] Aadhaar ${data.aadhaar_no} already exists for employee ${aadhaarRows[0].emp_no}`);
                    await connection.rollback();
                    connection.release();
                    return callback({ 
                        customError: true, 
                        message: `Aadhaar number provided (${data.aadhaar_no}) already exists for employee ${aadhaarRows[0].emp_no}.` 
                    });
                }
            }

            // Define fields to update with display names
            const fieldsToUpdate = [
                'mobile', 'aadhaar_no', 'email', 'fname', 'mname', 'lname',
                'gender', 'dob', 'blood_group', 'address_current', 'address_permanent',
                'emerg_contact_name', 'emerg_contact_number', 'emerg_contact_relation', 'email_office'
            ];

            const fieldDisplayNames = {
                mobile: 'MobileNumber', aadhaar_no: 'AadhaarNumber', email: 'Email', 
                fname: 'FirstName', mname: 'MiddleName', lname: 'LastName',
                gender: 'Gender', dob: 'DateOfBirth', blood_group: 'BloodGroup', 
                address_current: 'CurrentAddress', address_permanent: 'PermanentAddress',
                emerg_contact_name: 'EmergencyContactName', 
                emerg_contact_number: 'EmergencyContactNumber', 
                emerg_contact_relation: 'EmergencyContactRelation', 
                email_office: 'OfficeEmail'
            };

            // Find changed fields
            const changedFields = [];
            const updateValues = {};
            let mobileChanged = false;

            fieldsToUpdate.forEach(field => {
                const currentValue = curr[field] || '';
                const newValue = data[field] || '';
                
                if (String(currentValue) !== String(newValue)) {
                    changedFields.push(`${fieldDisplayNames[field]}: [Previous: ${currentValue || 'EMPTY'}, Current: ${newValue || 'EMPTY'}]`);
                    updateValues[field] = data[field];
                    if (field === 'mobile') mobileChanged = true;
                }
            });

            // Check if any changes were detected
            if (changedFields.length === 0) {
                console.log(`[UpdatePersonalDetails] No changes detected for employee ID ${id}`);
                await connection.rollback();
                connection.release();
                return callback({ customError: true, message: "No changes detected." });
            }

            // Add audit fields
            const now = new Date();
            updateValues.updated_by = data.logedInEmpNo;
            updateValues.update_datetime = now;

            console.log(`[UpdatePersonalDetails] Updating employee ID ${id} with:`, updateValues);
            console.log(`[UpdatePersonalDetails] Changed fields:`, changedFields);

            // Perform the update
            const [updateResult] = await connection.query("UPDATE employee SET ? WHERE id = ?", [updateValues, id]);
            console.log(`[UpdatePersonalDetails] Rows affected: ${updateResult.affectedRows}`);

            // Update user_login if mobile number changed
            if (mobileChanged) {
                console.log(`[UpdatePersonalDetails] Mobile number changed, updating user_login for employee ID ${id}`);
                await connection.query(
                    "UPDATE user_login SET username = ?, updated_by = ?, update_datetime = ? WHERE employee_id_fk = ?",
                    [data.mobile, data.logedInEmpNo, now, id]
                );
                console.log(`[UpdatePersonalDetails] User login updated successfully`);
            }

            // Insert change log
            console.log(`[UpdatePersonalDetails] Inserting change log for employee ID ${id}`);
            const logData = {
                employee_id_fk: id,
                type_of_change: 'PERSONAL_DETAILS',
                reason_of_change: 'Personal details updated',
                change_details: changedFields.join(', '),
                create_datetime: now,
                created_by: data.logedInEmpNo
            };

            await connection.query("INSERT INTO employee_change_log SET ?", logData);
            console.log(`[UpdatePersonalDetails] Change log inserted successfully`);

            // Commit transaction
            await connection.commit();
            console.log(`[UpdatePersonalDetails] Transaction committed successfully for employee ID ${id}`);
            
            connection.release();
            callback(null, true);

        } catch (err) {
            console.error(`[UpdatePersonalDetails] Error updating employee ID ${id}:`, err);
            
            if (connection) {
                try {
                    await connection.rollback();
                    console.log(`[UpdatePersonalDetails] Transaction rolled back due to error`);
                    connection.release();
                } catch (rollbackErr) {
                    console.error(`[UpdatePersonalDetails] Error during rollback:`, rollbackErr);
                }
            }
            
            callback(err);
        }
    },

    updateWorkDetails: async (id, data, callback) => {
        console.log('* CB-API * Employee.updateWorkDetails Model Start ...');
        let connection;
        try {
            // Validate dates before proceeding
            const { date_of_joining, probation_period_end_date } = data;
            
            // Function to validate if date exists (e.g., not June 31)
            const isValidDate = (dateString) => {
                if (!dateString) return true;
                const date = new Date(dateString);
                const [year, month, day] = dateString.split('-').map(Number);
                
                // Check if it's a valid date and the day matches (to catch invalid dates like June 31)
                return date instanceof Date && !isNaN(date) && 
                    date.getDate() === day && 
                    date.getMonth() + 1 === month &&
                    date.getFullYear() === year;
            };

            // Validate date_of_joining if provided
            if (date_of_joining && !isValidDate(date_of_joining)) {
                console.log(`[UpdateWorkDetails] Invalid date_of_joining: ${date_of_joining}`);
                return callback({ 
                    customError: true, 
                    message: `Invalid date_of_joining: ${date_of_joining}. Please provide a valid date.` 
                });
            }

            // Validate probation_period_end_date if provided
            if (probation_period_end_date && !isValidDate(probation_period_end_date)) {
                console.log(`[UpdateWorkDetails] Invalid probation_period_end_date: ${probation_period_end_date}`);
                return callback({ 
                    customError: true, 
                    message: `Invalid probation_period_end_date: ${probation_period_end_date}. Please provide a valid date.` 
                });
            }

            // Check if probation period end date is not earlier than date of joining
            if (probation_period_end_date && date_of_joining) {
                const joiningDate = new Date(date_of_joining);
                const probationEndDate = new Date(probation_period_end_date);
                
                if (probationEndDate < joiningDate) {
                    console.log(`[UpdateWorkDetails] Probation end date (${probation_period_end_date}) is earlier than joining date (${date_of_joining})`);
                    return callback({ 
                        customError: true, 
                        message: 'Probation period end date cannot be earlier than date of joining.' 
                    });
                }
            }

            // Get a connection from the pool
            connection = await db.promise.getConnection();
            console.log(`[UpdateWorkDetails] Starting transaction for employee ID: ${id}`);
            
            await connection.beginTransaction();

            // Get current employee data
            console.log(`[UpdateWorkDetails] Fetching current data for employee ID: ${id}`);
            const [currentRows] = await connection.query("SELECT * FROM employee WHERE id = ?", [id]);
            
            if (currentRows.length === 0) {
                await connection.rollback();
                connection.release();
                return callback({ customError: true, message: "Employee not found." });
            }
            
            const curr = currentRows[0];

            // Check for duplicate employee number if it's being changed
            if (data.emp_no && data.emp_no !== curr.emp_no) {
                console.log(`[UpdateWorkDetails] Checking employee number uniqueness: ${data.emp_no}`);
                const [empNoRows] = await connection.query(
                    "SELECT id FROM employee WHERE emp_no = ? AND id != ?",
                    [data.emp_no, id]
                );
                
                if (empNoRows.length > 0) {
                    console.log(`[UpdateWorkDetails] Employee number ${data.emp_no} already exists`);
                    await connection.rollback();
                    connection.release();
                    return callback({ 
                        customError: true, 
                        message: `Employee number provided (${data.emp_no}) already exists.` 
                    });
                }
            }

            // Define field mappings for change tracking
            const fieldMappings = {
                level_code: 'Level',
                rule: 'Rule',
                shift: 'Shift',
                date_of_joining: 'DateOfJoining',
                probation_period_end_date: 'ProbationEndDate',
                is_manager: 'IsManager',
                manager_empid: 'ManagerEmployeeID',
                department_code: 'Department',
                designation_id_fk: 'Designation',
                posting_location: 'PostingLocation',
                employee_type: 'EmployeeType',
                emp_no: 'EmployeeNumber'
            };

            // Find changed fields
            const changedFields = [];
            const updateValues = {};

            Object.keys(fieldMappings).forEach(field => {
                // Handle designation_code vs designation_id_fk mapping
                const fieldValue = field === 'designation_id_fk' ? data.designation_code : data[field];
                const currentValue = curr[field] || '';
                const newValue = fieldValue || '';
                
                if (String(currentValue) !== String(newValue)) {
                    changedFields.push(`${fieldMappings[field]}: [Previous: ${currentValue || 'EMPTY'}, Current: ${newValue || 'EMPTY'}]`);
                    
                    // Map designation_code back to designation_id_fk for update
                    if (field === 'designation_id_fk') {
                        updateValues[field] = data.designation_code;
                    } else {
                        updateValues[field] = data[field];
                    }
                }
            });

            // Check if any changes were detected
            if (changedFields.length === 0 && !data.office_location && !data.rule) {
                console.log(`[UpdateWorkDetails] No changes detected for employee ID ${id}`);
                await connection.rollback();
                connection.release();
                return callback({ customError: true, message: "No changes detected." });
            }

            // Add audit fields
            const now = new Date();
            updateValues.updated_by = data.logedInEmpNo;
            updateValues.update_datetime = now;

            // Only update if there are field changes
            if (Object.keys(updateValues).length > 0) {
                console.log(`[UpdateWorkDetails] Updating employee ID ${id} with:`, updateValues);
                
                // Build dynamic update query
                const updateSql = "UPDATE employee SET ? WHERE id = ?";
                const [updateResult] = await connection.query(updateSql, [updateValues, id]);
                console.log(`[UpdateWorkDetails] Rows affected: ${updateResult.affectedRows}`);
            }

            // Handle location mappings
            console.log(`[UpdateWorkDetails] Updating location mappings for employee ID ${id}`);
            
            // Delete existing location mappings
            await connection.query("DELETE FROM employee_location_mapping WHERE employee_id_fk = ?", [id]);
            console.log(`[UpdateWorkDetails] Deleted existing location mappings`);

            // Insert new location mappings
            const locations = data.office_location ? data.office_location.split(',').map(l => l.trim()) : [];
            console.log(`[UpdateWorkDetails] Processing ${locations.length} locations...`);
            
            for (const locCode of locations) {
                const [locRows] = await connection.query(
                    "SELECT id FROM employee_location WHERE location_code = ?", 
                    [locCode]
                );
                
                if (locRows.length > 0) {
                    await connection.query(
                        "INSERT INTO employee_location_mapping (employee_id_fk, location_id_fk, location_code) VALUES (?, ?, ?)",
                        [id, locRows[0].id, locCode]
                    );
                    console.log(`[UpdateWorkDetails] Location mapping added for: ${locCode}`);
                } else {
                    console.log(`[UpdateWorkDetails] No location found for code: ${locCode}`);
                }
            }

            // Handle rule mappings
            console.log(`[UpdateWorkDetails] Updating rule mappings for employee ID ${id}`);
            
            // Delete existing rule mappings
            await connection.query("DELETE FROM employee_rule_mapping WHERE employee_id_fk = ?", [id]);
            console.log(`[UpdateWorkDetails] Deleted existing rule mappings`);

            // Insert new rule mappings
            const rules = data.rule ? data.rule.split(',').map(r => r.trim()) : [];
            console.log(`[UpdateWorkDetails] Processing ${rules.length} rules...`);
            
            let is4thSat = 'N';
            for (const ruleCode of rules) {
                const [ruleRows] = await connection.query(
                    "SELECT id FROM config_master WHERE code = ?", 
                    [ruleCode]
                );
                
                if (ruleRows.length > 0) {
                    if (ruleCode === '4TH_SATURDAY_APPLICABLE') {
                        is4thSat = 'Y';
                    }
                    
                    await connection.query(
                        "INSERT INTO employee_rule_mapping (employee_id_fk, rule_id_fk, rule_code, created_by, create_datetime) VALUES (?, ?, ?, ?, ?)",
                        [id, ruleRows[0].id, ruleCode, data.logedInEmpNo, now]
                    );
                    console.log(`[UpdateWorkDetails] Rule mapping added for: ${ruleCode}`);
                } else {
                    console.log(`[UpdateWorkDetails] No rule found for code: ${ruleCode}`);
                }
            }

            // Update employee with 4th Saturday setting
            await connection.query(
                "UPDATE employee SET is_4th_saturday_allowed = ? WHERE id = ?", 
                [is4thSat, id]
            );
            console.log(`[UpdateWorkDetails] 4th Saturday setting updated to: ${is4thSat}`);

            // Insert change log if there were changes
            if (changedFields.length > 0) {
                console.log(`[UpdateWorkDetails] Inserting change log for employee ID ${id}`);
                const logData = {
                    employee_id_fk: id,
                    type_of_change: 'WORKING_DETAILS',
                    reason_of_change: 'Working details updated',
                    change_details: changedFields.join(', '),
                    create_datetime: now,
                    created_by: data.logedInEmpNo
                };

                await connection.query("INSERT INTO employee_change_log SET ?", logData);
                console.log(`[UpdateWorkDetails] Change log inserted successfully`);
            }

            // Commit transaction
            await connection.commit();
            console.log(`[UpdateWorkDetails] Transaction committed successfully for employee ID ${id}`);
            
            connection.release();
            callback(null, true);

        } catch (err) {
            console.error(`[UpdateWorkDetails] Error updating employee ID ${id}:`, err);
            
            if (connection) {
                try {
                    await connection.rollback();
                    console.log(`[UpdateWorkDetails] Transaction rolled back due to error`);
                    connection.release();
                } catch (rollbackErr) {
                    console.error(`[UpdateWorkDetails] Error during rollback:`, rollbackErr);
                }
            }
            
            callback(err);
        }
    },

    updateSalaryDetails: async (data, callback) => {
        console.log('* CB-API * Employee.updateSalaryDetails Model Start ...');
        let connection;
        try {
            const { employee_id, logedInEmpNo, uan_no, esic_no, bank_name, bank_accnt_no, bank_branch, bank_ifsc, pan_no } = data;

            if (!employee_id || !logedInEmpNo) {
                return callback({ customError: true, message: "Employee ID and logged in employee number are required." });
            }

            // Get a connection from the pool
            connection = await db.promise.getConnection();
            console.log(`[UpdateSalaryDetails] Starting transaction for employee ID: ${employee_id}`);
            
            await connection.beginTransaction();

            // Get current employee data
            console.log(`[UpdateSalaryDetails] Fetching current data for employee ID: ${employee_id}`);
            const [currentRows] = await connection.query("SELECT * FROM employee WHERE id = ?", [employee_id]);
            
            if (currentRows.length === 0) {
                await connection.rollback();
                connection.release();
                return callback({ customError: true, message: "Employee record not found." });
            }
            
            const curr = currentRows[0];
            const organization_id = curr.organization_id_fk;

            // Field mappings for display names
            const fieldMappings = {
                uan_no: 'UAN',
                esic_no: 'ESIC',
                bank_name: 'BankName',
                bank_accnt_no: 'BankAccountNumber',
                bank_branch: 'BankBranch',
                bank_ifsc: 'IFSC',
                pan_no: 'PAN'
            };

            // Fields to check for duplicates
            const duplicateChecks = [];
            
            // Check for duplicate UAN number
            if (uan_no && uan_no !== curr.uan_no) {
                console.log(`[UpdateSalaryDetails] Checking UAN uniqueness: ${uan_no}`);
                duplicateChecks.push(
                    connection.query(
                        "SELECT emp_no FROM employee WHERE uan_no = ? AND organization_id_fk = ? AND id != ?",
                        [uan_no, organization_id, employee_id]
                    ).then(([rows]) => ({ field: 'UAN', value: uan_no, rows }))
                );
            }

            // Check for duplicate ESIC number
            if (esic_no && esic_no !== curr.esic_no) {
                console.log(`[UpdateSalaryDetails] Checking ESIC uniqueness: ${esic_no}`);
                duplicateChecks.push(
                    connection.query(
                        "SELECT emp_no FROM employee WHERE esic_no = ? AND organization_id_fk = ? AND id != ?",
                        [esic_no, organization_id, employee_id]
                    ).then(([rows]) => ({ field: 'ESIC', value: esic_no, rows }))
                );
            }

            // Check for duplicate PAN number
            if (pan_no && pan_no !== curr.pan_no) {
                console.log(`[UpdateSalaryDetails] Checking PAN uniqueness: ${pan_no}`);
                duplicateChecks.push(
                    connection.query(
                        "SELECT emp_no FROM employee WHERE pan_no = ? AND organization_id_fk = ? AND id != ?",
                        [pan_no, organization_id, employee_id]
                    ).then(([rows]) => ({ field: 'PAN', value: pan_no, rows }))
                );
            }

            // Run all duplicate checks
            if (duplicateChecks.length > 0) {
                const results = await Promise.all(duplicateChecks);
                
                for (const result of results) {
                    if (result.rows.length > 0) {
                        const empNo = result.rows[0].emp_no;
                        console.log(`[UpdateSalaryDetails] Duplicate found: ${result.field} = ${result.value} already exists for employee ${empNo}`);
                        await connection.rollback();
                        connection.release();
                        return callback({ 
                            customError: true, 
                            message: `${result.field} number provided (${result.value}) already exists for employee ${empNo}. Please use a different ${result.field} number.` 
                        });
                    }
                }
            }

            // Fields to update
            const fieldsToUpdate = {
                uan_no, esic_no, bank_name, bank_accnt_no, bank_branch, bank_ifsc, pan_no
            };

            // Track changed fields
            const changedFields = [];
            const updateValues = {};

            Object.keys(fieldsToUpdate).forEach(field => {
                const newValue = fieldsToUpdate[field] || '';
                const currentValue = curr[field] || '';
                
                if (String(currentValue) !== String(newValue)) {
                    const displayName = fieldMappings[field] || field;
                    changedFields.push(`${displayName}: [Previous: ${currentValue || 'EMPTY'}, Current: ${newValue || 'EMPTY'}]`);
                    updateValues[field] = fieldsToUpdate[field];
                }
            });

            // Check if any changes were detected
            if (changedFields.length === 0) {
                console.log(`[UpdateSalaryDetails] No changes detected for employee ID ${employee_id}`);
                await connection.rollback();
                connection.release();
                return callback(null, false); // false indicates no changes
            }

            // Add audit fields
            const now = new Date();
            updateValues.updated_by = logedInEmpNo;
            updateValues.update_datetime = now;

            console.log(`[UpdateSalaryDetails] Updating employee ID ${employee_id} with:`, updateValues);
            console.log(`[UpdateSalaryDetails] Changed fields:`, changedFields);

            // Perform the update
            const [updateResult] = await connection.query(
                "UPDATE employee SET ? WHERE id = ?", 
                [updateValues, employee_id]
            );
            
            console.log(`[UpdateSalaryDetails] Rows affected: ${updateResult.affectedRows}`);

            if (updateResult.affectedRows > 0) {
                // Insert change log
                console.log(`[UpdateSalaryDetails] Inserting change log for employee ID ${employee_id}`);
                const logData = {
                    employee_id_fk: employee_id,
                    type_of_change: 'SALARY_DETAILS',
                    reason_of_change: 'Salary details updated',
                    change_details: changedFields.join(', '),
                    create_datetime: now,
                    created_by: logedInEmpNo
                };

                await connection.query("INSERT INTO employee_change_log SET ?", logData);
                console.log(`[UpdateSalaryDetails] Change log inserted successfully`);

                // Commit transaction
                await connection.commit();
                console.log(`[UpdateSalaryDetails] Transaction committed successfully for employee ID ${employee_id}`);
                
                connection.release();
                callback(null, true); // true indicates successful update
            } else {
                // No rows affected (shouldn't happen due to our change detection, but just in case)
                await connection.rollback();
                connection.release();
                callback(null, false);
            }

        } catch (err) {
            console.error(`[UpdateSalaryDetails] Error updating employee ID ${data.employee_id}:`, err);
            
            if (connection) {
                try {
                    await connection.rollback();
                    console.log(`[UpdateSalaryDetails] Transaction rolled back due to error`);
                    connection.release();
                } catch (rollbackErr) {
                    console.error(`[UpdateSalaryDetails] Error during rollback:`, rollbackErr);
                }
            }
            
            callback(err);
        }
    },

    nameList: async (params, callback) => {
        console.log('* CB-API * Employee.nameList Model Start ...');
        try {
            const { organization_id, month, year, status } = params;

            console.log(`[NameList] Building query with params:`, params);

            // Base query
            let query = `
                SELECT 
                    UPPER(CONCAT(e.fname, ' ', COALESCE(e.mname, ''), ' ', e.lname)) as name,
                    e.id,
                    e.emp_no,
                    e.status,
                    DATE_FORMAT(e.date_of_leaving, '%Y-%m-%d') as date_of_leaving
                FROM employee e
                LEFT JOIN organization o ON o.id = e.organization_id_fk
                WHERE e.organization_id_fk = ${db.promise.escape(organization_id)}
                AND e.organization_id_fk != 0
                AND e.is_deleted = 'N'
            `;

            // Handle month/year filtering
            if (month && year) {
                const monthStart = `${year}-${month.padStart(2, '0')}-01`;
                const lastDay = new Date(year, month, 0).getDate();
                const monthEnd = `${year}-${month.padStart(2, '0')}-${lastDay}`;
                
                console.log(`[NameList] Month filter - Start: ${monthStart}, End: ${monthEnd}`);

                if (status !== undefined && status !== null && status !== '') {
                    // Status is provided - filter by specific status
                    console.log(`[NameList] Filtering by status: ${status}`);
                    query += ` AND e.status = ${db.promise.escape(status)}`;
                } else {
                    // Status is blank/empty - show ALL employees with date leaving logic
                    console.log(`[NameList] Status is blank - showing all employees with date filter`);
                    query += ` AND (
                        e.date_of_leaving IS NULL 
                        OR e.date_of_leaving = '' 
                        OR (e.date_of_leaving >= ${db.promise.escape(monthStart)} AND e.date_of_leaving <= ${db.promise.escape(monthEnd)})
                        OR e.date_of_leaving < ${db.promise.escape(monthStart)}
                    )`;
                }
            } else {
                // No month/year provided
                console.log(`[NameList] No month/year filter applied`);
                
                if (status !== undefined && status !== null && status !== '') {
                    // Status is provided - filter by specific status
                    console.log(`[NameList] Filtering by status (no month/year): ${status}`);
                    query += ` AND e.status = ${db.promise.escape(status)}`;
                } else {
                    // Status is blank/empty - show ALL employees
                    console.log(`[NameList] Status is blank - showing all employees (no filters)`);
                    // No additional filters
                }
            }

            // Add order by
            query += ` ORDER BY name ASC`;

            console.log(`[NameList] Executing query`);
            
            const [rows] = await db.promise.query(query);
            
            console.log(`[NameList] Result count: ${rows.length}`);

            callback(null, rows);

        } catch (err) {
            console.error("[NameList] Error:", err);
            callback(err);
        }
    },

    listNotInLeaveMaster: async (params, callback) => {
        console.log('* CB-API * Employee.listNotInLeaveMaster Model Start ...');
        try {
            const { organization_id } = params;

            console.log(`[ListNotInLeaveMaster] Building query for organization_id: ${organization_id}`);

            const query = `
                SELECT 
                    UPPER(CONCAT(e.fname, ' ', COALESCE(e.mname, ''), ' ', e.lname)) AS name,
                    e.id,
                    e.emp_no
                FROM employee e
                LEFT JOIN employee_leave_master elm ON e.id = elm.employee_id_fk
                LEFT JOIN organization o ON o.id = e.organization_id_fk
                WHERE 1 = 1
                    AND e.status IN (1, 2)
                    AND elm.employee_id_fk IS NULL
                    AND e.organization_id_fk = ${db.promise.escape(organization_id)}
                    AND e.is_deleted = 'N'
                ORDER BY name ASC
            `;

            console.log(`[ListNotInLeaveMaster] Executing query`);
            
            const [rows] = await db.promise.query(query);
            
            console.log(`[ListNotInLeaveMaster] Result count: ${rows.length}`);

            callback(null, rows);

        } catch (err) {
            console.error("[ListNotInLeaveMaster] Error:", err);
            callback(err);
        }
    },

    viewChangeLog: async (params, callback) => {
        console.log('* CB-API * Employee.viewChangeLog Model Start ...');
        try {
            const { organization_id, employee_id, type_of_change } = params;

            console.log(`[ViewChangeLog] Building query for organization_id: ${organization_id}`);

            // Build where condition
            let whereCondition = `1 AND e.organization_id_fk = ${db.promise.escape(organization_id)}`;

            if (employee_id && employee_id !== '') {
                whereCondition += ` AND ecl.employee_id_fk = ${db.promise.escape(employee_id)}`;
            }

            if (type_of_change && type_of_change !== '') {
                whereCondition += ` AND cm.name = ${db.promise.escape(type_of_change)}`;
            }

            // Main query for change logs
            const changeLogQuery = `
                SELECT 
                    ecl.id,
                    ecl.employee_id_fk,
                    ecl.type_of_change,
                    ecl.reason_of_change,
                    ecl.change_details,
                    DATE_FORMAT(ecl.create_datetime, '%Y-%m-%d %H:%i:%s') as create_datetime,
                    ecl.created_by,
                    e.emp_no,
                    UPPER(CONCAT(e.fname, ' ', COALESCE(e.mname, ''), ' ', e.lname)) AS emp_name
                FROM employee_change_log ecl
                LEFT JOIN employee e ON e.id = ecl.employee_id_fk
                LEFT JOIN config_master cm ON cm.code = ecl.type_of_change
                WHERE ${whereCondition}
                ORDER BY ecl.create_datetime DESC
            `;

            // Query for change types configuration
            const configQuery = `
                SELECT code, name 
                FROM config_master 
                WHERE type = 'employee_change'
                ORDER BY name ASC
            `;

            console.log(`[ViewChangeLog] Executing main query`);
            const [changeLogRows] = await db.promise.query(changeLogQuery);
            
            console.log(`[ViewChangeLog] Executing config query`);
            const [configRows] = await db.promise.query(configQuery);
            
            console.log(`[ViewChangeLog] Change logs count: ${changeLogRows.length}`);
            console.log(`[ViewChangeLog] Change types count: ${configRows.length}`);

            callback(null, {
                change_log: changeLogRows,
                employee_change_types: configRows
            });

        } catch (err) {
            console.error("[ViewChangeLog] Error:", err);
            callback(err);
        }
    },

    updateStatus: async (data, callback) => {
        console.log('* CB-API * Employee.updateStatus Model Start ...');
        let connection;
        try {
            const { employee_id, status, reason, date_of_leaving, your_emp_id, logedInEmpNo } = data;

            // Determine isblocked based on status
            const isblocked = (status == 1) ? 0 : 1;
            
            // Handle date_of_leaving - set to NULL if empty or status is 1 (active)
            let dateOfLeavingValue = null;
            if (date_of_leaving && status != 1) {
                // Validate that date_of_leaving is not a future date if status is 3 or 4
                if ((status == 3 || status == 4) && new Date(date_of_leaving) > new Date()) {
                    return callback({ 
                        customError: true, 
                        message: 'Date of leaving cannot be a future date.' 
                    });
                }
                dateOfLeavingValue = date_of_leaving;
            }

            console.log(`[UpdateStatus] Starting transaction for employee ID: ${employee_id}`);
            
            // Get a connection from the pool
            connection = await db.promise.getConnection();
            await connection.beginTransaction();

            // Get current employee data
            console.log(`[UpdateStatus] Fetching current data for employee ID: ${employee_id}`);
            const [empRows] = await connection.query("SELECT * FROM employee WHERE id = ?", [employee_id]);
            
            if (empRows.length === 0) {
                await connection.rollback();
                connection.release();
                return callback({ customError: true, message: "Employee not found." });
            }
            
            const empRow = empRows[0];
            const now = new Date();

            // Update employee status
            console.log(`[UpdateStatus] Updating employee status to ${status}`);
            const updateQuery = `
                UPDATE employee 
                SET status = ?, 
                    isblocked = ?, 
                    updated_by = ?, 
                    update_datetime = ?, 
                    date_of_leaving = ?
                WHERE id = ?
            `;
            
            const [updateResult] = await connection.query(updateQuery, [
                status, 
                isblocked, 
                logedInEmpNo, 
                now, 
                dateOfLeavingValue, 
                employee_id
            ]);
            
            console.log(`[UpdateStatus] Rows affected: ${updateResult.affectedRows}`);

            if (updateResult.affectedRows > 0) {
                // If status is 3 (Left Company) or 4 (Retire), handle manager cleanup
                if (status == 3 || status == 4) {
                    console.log(`[UpdateStatus] Status is ${status}, cleaning up manager references`);
                    
                    // If employee was a manager, remove them as manager for others
                    if (empRow.is_manager == 1) {
                        console.log(`[UpdateStatus] Employee was a manager, removing manager references`);
                        await connection.query(
                            "UPDATE employee SET manager_empid = NULL WHERE manager_empid = ?",
                            [empRow.emp_no]
                        );
                    }

                    // Update the employee's own manager status
                    await connection.query(
                        "UPDATE employee SET is_manager = 0, manager_empid = NULL WHERE id = ?",
                        [employee_id]
                    );
                }

                // Update user_login table if record exists
                console.log(`[UpdateStatus] Checking user_login for employee ID: ${employee_id}`);
                const [userRows] = await connection.query(
                    "SELECT * FROM user_login WHERE employee_id_fk = ?", 
                    [employee_id]
                );
                
                if (userRows.length > 0) {
                    console.log(`[UpdateStatus] Updating user_login status to ${status}`);
                    await connection.query(
                        "UPDATE user_login SET isactive = ? WHERE employee_id_fk = ?",
                        [status, employee_id]
                    );
                }

                // Determine type of change for log
                const type_of_change = status == 1 ? 'ACTIVATE_EMPLOYMENT' : 'DEACTIVATE_EMPLOYMENT';

                // Insert change log
                console.log(`[UpdateStatus] Inserting change log`);
                const logData = {
                    employee_id_fk: employee_id,
                    type_of_change: type_of_change,
                    reason_of_change: reason,
                    create_datetime: now,
                    created_by: logedInEmpNo
                };

                const [logResult] = await connection.query("INSERT INTO employee_change_log SET ?", logData);
                
                if (!logResult.insertId) {
                    console.log(`[UpdateStatus] Warning: Change log insertion may have failed`);
                }

                // Commit transaction
                await connection.commit();
                console.log(`[UpdateStatus] Transaction committed successfully`);
                
                connection.release();
                
                callback(null, { 
                    success: true, 
                    data: updateResult 
                });

            } else {
                console.log(`[UpdateStatus] No rows affected`);
                await connection.rollback();
                connection.release();
                callback(null, { success: false });
            }

        } catch (err) {
            console.error(`[UpdateStatus] Error updating employee status:`, err);
            
            if (connection) {
                try {
                    await connection.rollback();
                    console.log(`[UpdateStatus] Transaction rolled back due to error`);
                    connection.release();
                } catch (rollbackErr) {
                    console.error(`[UpdateStatus] Error during rollback:`, rollbackErr);
                }
            }
            
            callback(err);
        }
    },

    viewTeamMembers: async (params, callback) => {
        console.log('* CB-API * Employee.viewTeamMembers Model Start ...');
        try {
            const { emp_no } = params;

            console.log(`[ViewTeamMembers] Building query for manager emp_no: ${emp_no}`);

            const query = `
                SELECT 
                    UPPER(CONCAT(fname, ' ', COALESCE(mname, ''), ' ', lname)) AS name,
                    mobile,
                    emp_no,
                    status
                FROM employee 
                WHERE manager_empid = ${db.promise.escape(emp_no)} 
                    AND status = 1 
                    AND is_deleted = 'N'
                ORDER BY name ASC
            `;

            console.log(`[ViewTeamMembers] Executing query`);
            
            const [rows] = await db.promise.query(query);
            
            console.log(`[ViewTeamMembers] Team members found: ${rows.length}`);

            callback(null, rows);

        } catch (err) {
            console.error("[ViewTeamMembers] Error:", err);
            callback(err);
        }
    },

    assignTeamMember: async (data, callback) => {
        console.log('* CB-API * Employee.assignTeamMember Model Start ...');
        let connection;
        try {
            const { emp_no, manager_empid } = data;

            console.log(`[AssignTeamMember] Checking if employee ${emp_no} exists`);

            // Get a connection from the pool
            connection = await db.promise.getConnection();
            
            // First check if the employee exists
            const [empRows] = await connection.query(
                "SELECT id, manager_empid FROM employee WHERE emp_no = ? AND is_deleted = 'N'",
                [emp_no]
            );
            
            if (empRows.length === 0) {
                connection.release();
                return callback({ 
                    customError: true, 
                    message: "Employee not found." 
                });
            }

            const employee = empRows[0];
            
            // Check if employee already has this manager
            if (employee.manager_empid === manager_empid) {
                console.log(`[AssignTeamMember] Employee ${emp_no} already has manager ${manager_empid}`);
                connection.release();
                return callback(null, { success: false });
            }

            // Check if manager exists
            console.log(`[AssignTeamMember] Verifying manager ${manager_empid} exists`);
            const [managerRows] = await connection.query(
                "SELECT id FROM employee WHERE emp_no = ? AND is_deleted = 'N'",
                [manager_empid]
            );
            
            if (managerRows.length === 0) {
                connection.release();
                return callback({ 
                    customError: true, 
                    message: "Manager not found." 
                });
            }

            // Update the employee with new manager
            console.log(`[AssignTeamMember] Updating employee ${emp_no} with manager ${manager_empid}`);
            const [updateResult] = await connection.query(
                "UPDATE employee SET manager_empid = ? WHERE emp_no = ?",
                [manager_empid, emp_no]
            );

            console.log(`[AssignTeamMember] Rows affected: ${updateResult.affectedRows}`);

            connection.release();

            if (updateResult.affectedRows > 0) {
                callback(null, { success: true, data: updateResult });
            } else {
                callback(null, { success: false });
            }

        } catch (err) {
            console.error("[AssignTeamMember] Error:", err);
            if (connection) connection.release();
            callback(err);
        }
    },

    removeTeamMember: async (data, callback) => {
        console.log('* CB-API * Employee.removeTeamMember Model Start ...');
        let connection;
        try {
            const { emp_no } = data;

            console.log(`[RemoveTeamMember] Checking if employee ${emp_no} exists`);

            // Get a connection from the pool
            connection = await db.promise.getConnection();
            
            // First check if the employee exists
            const [empRows] = await connection.query(
                "SELECT id, manager_empid FROM employee WHERE emp_no = ? AND is_deleted = 'N'",
                [emp_no]
            );
            
            if (empRows.length === 0) {
                connection.release();
                return callback({ 
                    customError: true, 
                    message: "Employee not found." 
                });
            }

            const employee = empRows[0];
            
            // Check if employee already has no manager
            if (!employee.manager_empid || employee.manager_empid === '') {
                console.log(`[RemoveTeamMember] Employee ${emp_no} already has no manager assigned`);
                connection.release();
                return callback(null, { success: false });
            }

            // Remove the manager assignment (set to empty string)
            console.log(`[RemoveTeamMember] Removing manager assignment for employee ${emp_no}`);
            const [updateResult] = await connection.query(
                "UPDATE employee SET manager_empid = '' WHERE emp_no = ?",
                [emp_no]
            );

            console.log(`[RemoveTeamMember] Rows affected: ${updateResult.affectedRows}`);

            connection.release();

            if (updateResult.affectedRows > 0) {
                callback(null, { success: true, data: updateResult });
            } else {
                callback(null, { success: false });
            }

        } catch (err) {
            console.error("[RemoveTeamMember] Error:", err);
            if (connection) connection.release();
            callback(err);
        }
    },

    managerList: async (params, callback) => {
        console.log('* CB-API * Employee.managerList Model Start ...');
        try {
            const { organization_id } = params;

            console.log(`[ManagerList] Building query for organization_id: ${organization_id}`);

            const query = `
                SELECT 
                    UPPER(CONCAT(e.fname, ' ', COALESCE(e.mname, ''), ' ', e.lname)) AS name,
                    e.id,
                    e.emp_no
                FROM employee e
                LEFT JOIN organization o ON o.id = e.organization_id_fk
                WHERE e.is_manager = 1
                    AND e.status IN (1, 2)
                    AND e.organization_id_fk = ${db.promise.escape(organization_id)}
                    AND e.is_deleted = 'N'
                ORDER BY name ASC
            `;

            console.log(`[ManagerList] Executing query`);
            
            const [rows] = await db.promise.query(query);
            
            console.log(`[ManagerList] Managers found: ${rows.length}`);

            callback(null, rows);

        } catch (err) {
            console.error("[ManagerList] Error:", err);
            callback(err);
        }
    },

    generateEmployeeNo: async (data, callback) => {
        console.log('* CB-API * Employee.generateEmployeeNo Model Start ...');
        let connection;
        try {
            const { organization_id } = data;

            console.log(`[GenerateEmployeeNo] Finding last employee number for organization: ${organization_id}`);

            // Get a connection from the pool
            connection = await db.promise.getConnection();

            // Get the last employee no for the specific organization, ordered by date_of_joining DESC
            const query = `
                SELECT emp_no 
                FROM employee 
                WHERE organization_id_fk = ? 
                ORDER BY STR_TO_DATE(date_of_joining, '%Y-%m-%d') DESC 
                LIMIT 1
            `;

            const [rows] = await connection.query(query, [organization_id]);
            
            let new_emp_no = '';
            let last_emp_no = null;

            if (rows && rows.length > 0 && rows[0].emp_no) {
                last_emp_no = rows[0].emp_no;
                console.log(`[GenerateEmployeeNo] Last employee number: ${last_emp_no}`);

                // Handle both numeric and alphanumeric employee numbers
                if (/^\d+$/.test(last_emp_no)) {
                    // For purely numeric employee numbers, preserve leading zeros
                    const length = last_emp_no.length;
                    const numericValue = parseInt(last_emp_no, 10);
                    new_emp_no = String(numericValue + 1).padStart(length, '0');
                    console.log(`[GenerateEmployeeNo] Numeric increment: ${new_emp_no}`);
                } else {
                    // For alphanumeric employee numbers
                    const matches = last_emp_no.match(/(\d+)/);
                    if (matches && matches.length > 0) {
                        const numericPart = matches[0];
                        const length = numericPart.length;
                        const newNumeric = String(parseInt(numericPart, 10) + 1).padStart(length, '0');
                        new_emp_no = last_emp_no.replace(/\d+/, newNumeric);
                        console.log(`[GenerateEmployeeNo] Alphanumeric increment: ${new_emp_no}`);
                    } else {
                        new_emp_no = last_emp_no + '1';
                        console.log(`[GenerateEmployeeNo] No numeric part found, appending 1: ${new_emp_no}`);
                    }
                }
            } else {
                // No employees found, create default with organization_id prefix
                new_emp_no = organization_id + '10000001';
                console.log(`[GenerateEmployeeNo] No existing employees, using default: ${new_emp_no}`);
            }

            // Ensure emp_no is unique by checking with string comparison
            console.log(`[GenerateEmployeeNo] Checking uniqueness for: ${new_emp_no}`);
            
            let [existingCheck] = await connection.query(
                "SELECT id FROM employee WHERE emp_no = ? AND organization_id_fk = ?",
                [new_emp_no, organization_id]
            );

            if (existingCheck && existingCheck.length > 0) {
                console.log(`[GenerateEmployeeNo] Employee number ${new_emp_no} already exists, finding next available`);
                
                let counter = 1;
                const base_emp_no = new_emp_no;
                const maxAttempts = 100;

                do {
                    if (/^\d+$/.test(base_emp_no)) {
                        const length = base_emp_no.length;
                        new_emp_no = String(parseInt(base_emp_no, 10) + counter).padStart(length, '0');
                    } else {
                        const matches = base_emp_no.match(/(\d+)/);
                        if (matches && matches.length > 0) {
                            const length = matches[0].length;
                            const newNumeric = String(parseInt(matches[0], 10) + counter).padStart(length, '0');
                            new_emp_no = base_emp_no.replace(/\d+/, newNumeric);
                        } else {
                            new_emp_no = base_emp_no + counter;
                        }
                    }

                    console.log(`[GenerateEmployeeNo] Trying alternative: ${new_emp_no}`);
                    
                    [existingCheck] = await connection.query(
                        "SELECT id FROM employee WHERE emp_no = ? AND organization_id_fk = ?",
                        [new_emp_no, organization_id]
                    );

                    counter++;
                } while (existingCheck && existingCheck.length > 0 && counter < maxAttempts);

                if (counter >= maxAttempts) {
                    connection.release();
                    return callback({ 
                        customError: true, 
                        message: "Unable to generate unique employee number after multiple attempts." 
                    });
                }
            }

            console.log(`[GenerateEmployeeNo] Final generated employee number: ${new_emp_no}`);
            
            connection.release();

            callback(null, {
                new_employee_no: new_emp_no,
                last_employee_no: last_emp_no
            });

        } catch (err) {
            console.error("[GenerateEmployeeNo] Error:", err);
            if (connection) connection.release();
            callback(err);
        }
    },

    deleteEmployee: async (data, callback) => {
        console.log('* CB-API * Employee.deleteEmployee Model Start ...');
        let connection;
        try {
            const { employee_id, emp_no, logedInEmpNo } = data;
            const now = new Date();

            console.log(`[DeleteEmployee] Starting transaction for employee ID: ${employee_id}, Emp No: ${emp_no}`);

            // Get a connection from the pool
            connection = await db.promise.getConnection();
            await connection.beginTransaction();

            // Check if employee exists and is not deleted
            console.log(`[DeleteEmployee] Checking if employee exists and is active`);
            const [empRows] = await connection.query(
                "SELECT * FROM employee WHERE emp_no = ? AND is_deleted = 'N'",
                [emp_no]
            );
            
            if (empRows.length === 0) {
                await connection.rollback();
                connection.release();
                return callback({ 
                    customError: true, 
                    message: "Employee not found or already deleted.",
                    error: "Invalid emp_no"
                });
            }
            
            const empRow = empRows[0];

            // If employee was a manager, remove them as manager for others
            if (empRow.is_manager == 1) {
                console.log(`[DeleteEmployee] Employee was a manager, removing manager references`);
                await connection.query(
                    "UPDATE employee SET manager_empid = NULL WHERE manager_empid = ?",
                    [emp_no]
                );
            }

            // Update employee record - soft delete
            console.log(`[DeleteEmployee] Soft deleting employee record`);
            const updateData = {
                is_deleted: 'Y',
                is_manager: 0,
                deleted_by: logedInEmpNo,
                deleted_datetime: now,
                manager_empid: null
            };

            const [updateResult] = await connection.query(
                "UPDATE employee SET ? WHERE emp_no = ?",
                [updateData, emp_no]
            );

            console.log(`[DeleteEmployee] Employee update affected rows: ${updateResult.affectedRows}`);

            // Update employee_payscale records
            console.log(`[DeleteEmployee] Updating employee_payscale records`);
            const updatePayscaleData = {
                is_deleted: 'Y',
                deleted_by: logedInEmpNo,
                deleted_datetime: now
            };

            const [payscaleResult] = await connection.query(
                "UPDATE employee_payscale SET ? WHERE employee_id_fk = ?",
                [updatePayscaleData, employee_id]
            );

            console.log(`[DeleteEmployee] Payscale update affected rows: ${payscaleResult.affectedRows}`);

            // Insert change log
            console.log(`[DeleteEmployee] Inserting change log`);
            const logData = {
                employee_id_fk: employee_id,
                type_of_change: 'DELETE_EMPLOYEE',
                reason_of_change: 'Duplicate Entry',
                create_datetime: now,
                created_by: logedInEmpNo
            };

            const [logResult] = await connection.query("INSERT INTO employee_change_log SET ?", logData);
            
            if (!logResult.insertId) {
                console.log(`[DeleteEmployee] Warning: Change log insertion may have failed`);
            }

            // Commit transaction
            await connection.commit();
            console.log(`[DeleteEmployee] Transaction committed successfully`);
            
            connection.release();
            
            callback(null, { success: true });

        } catch (err) {
            console.error("[DeleteEmployee] Error:", err);
            
            if (connection) {
                try {
                    await connection.rollback();
                    console.log(`[DeleteEmployee] Transaction rolled back due to error`);
                    connection.release();
                } catch (rollbackErr) {
                    console.error(`[DeleteEmployee] Error during rollback:`, rollbackErr);
                }
            }
            
            callback(err);
        }
    },

    search: async (params, callback) => {
        console.log('* CB-API * Employee.search Model Start ...');
        try {
            const { organization_id, search_input, search_by } = params;

            console.log(`[Search] Building query for organization_id: ${organization_id}, ${search_by}: ${search_input}`);

            // Build where condition
            let whereCondition = `e.organization_id_fk = ${db.promise.escape(organization_id)}`;

            // Add search condition based on search_by field
            if (search_by && search_input) {
                const allowedFields = ['aadhaar_no', 'pan_no', 'uan_no', 'esic_no'];
                if (allowedFields.includes(search_by)) {
                    whereCondition += ` AND e.${search_by} = ${db.promise.escape(search_input)}`;
                }
            }

            whereCondition += ` AND e.is_deleted = 'N'`;

            const query = `
                SELECT 
                    e.id, 
                    e.emp_no, 
                    UPPER(CONCAT(e.fname, ' ', COALESCE(e.mname, ''), ' ', e.lname)) as name,
                    e.fname, 
                    e.mname, 
                    e.lname, 
                    e.mobile, 
                    e.email, 
                    e.aadhaar_no, 
                    e.gender, 
                    DATE_FORMAT(e.dob, '%Y-%m-%d') as dob,
                    e.blood_group, 
                    e.address_current, 
                    e.is_manager, 
                    e.address_permanent,
                    e.emerg_contact_name, 
                    e.emerg_contact_number, 
                    e.emerg_contact_relation,
                    e.employee_type,
                    DATE_FORMAT(e.date_of_joining, '%Y-%m-%d') as date_of_joining,
                    e.email_office, 
                    e.shift, 
                    ANY_VALUE(ott.shift_name) as shift_name, 
                    ANY_VALUE(ott.in_grace_time) as in_grace_time, 
                    ANY_VALUE(ott.second_half_start_time) as second_half_start_time, 
                    ANY_VALUE(ott.half_day_in_time) as half_day_in_time, 
                    ANY_VALUE(ott.half_day_in_grace_time) as half_day_in_grace_time, 
                    ANY_VALUE(ott.half_day_out_time) as half_day_out_time,
                    DATE_FORMAT(e.date_of_leaving, '%Y-%m-%d') as date_of_leaving,
                    ANY_VALUE(ott.weekly_off_day) as weekly_off_day, 
                    ANY_VALUE(ott.office_hours) as office_hours, 
                    e.manager_empid, 
                    e.isblocked, 
                    e.status, 
                    e.is_debug_on, 
                    e.is_reg_image_approved, 
                    GROUP_CONCAT(DISTINCT elm.location_code) as location_code,
                    GROUP_CONCAT(DISTINCT cl.name) as office_location, 
                    GROUP_CONCAT(DISTINCT erm.rule_code) AS rule_code,
                    GROUP_CONCAT(DISTINCT cm.name) AS rule_name, 
                    o.name as org_name, 
                    o.code as org_code,
                    ANY_VALUE(UPPER(CONCAT(em.fname, ' ', COALESCE(em.mname, ''), ' ', em.lname))) as manager_name,
                    ANY_VALUE(em.email) as manager_personal_email, 
                    ANY_VALUE(em.email_office) as manager_office_email, 
                    ANY_VALUE(em.mobile) as manager_contact_number,
                    ANY_VALUE(ott.in_time) as office_in_time, 
                    ANY_VALUE(ott.out_time) as office_out_time,
                    ANY_VALUE(omd.value) as department_name, 
                    ANY_VALUE(omdes.value) as designation_name,
                    e.posting_location as posting_location_name, 
                    e.uan_no, 
                    e.esic_no,
                    e.bank_name, 
                    e.bank_accnt_no, 
                    e.bank_branch, 
                    e.bank_ifsc,
                    DATE_FORMAT(e.update_datetime, '%Y-%m-%d %H:%i:%s') as update_datetime,
                    e.updated_by
                FROM employee e
                LEFT JOIN employee_location_mapping elm ON e.id = elm.employee_id_fk
                LEFT JOIN employee_location cl ON elm.location_code = cl.location_code
                LEFT JOIN employee_rule_mapping erm ON e.id = erm.employee_id_fk
                LEFT JOIN config_master cm ON cm.id = erm.rule_id_fk
                LEFT JOIN organization o ON o.id = e.organization_id_fk
                LEFT JOIN employee em ON e.manager_empid = em.emp_no
                LEFT JOIN organization_time_table ott ON CONVERT(ott.shift_code USING utf8mb4) = CONVERT(e.shift USING utf8mb4) AND e.organization_id_fk = ott.organization_id_fk 
                LEFT JOIN organization_master_department omd ON omd.code = e.department_code
                LEFT JOIN organization_master_designation omdes ON omdes.id = e.designation_id_fk
                WHERE ${whereCondition}
                GROUP BY e.id
                ORDER BY name ASC
            `;
            
            const [rows] = await db.promise.query(query);
            
            console.log(`[Search] Results found: ${rows.length}`);

            callback(null, rows);

        } catch (err) {
            console.error("[Search] Error:", err);
            callback(err);
        }
    },

    uniquePostingLocations: async (params, callback) => {
        console.log('* CB-API * Employee.uniquePostingLocations Model Start ...');
        try {
            const { organization_id } = params;

            console.log(`[UniquePostingLocations] Building query for organization_id: ${organization_id}`);

            const query = `
                SELECT DISTINCT posting_location
                FROM employee
                WHERE organization_id_fk = ${db.promise.escape(organization_id)}
                    AND posting_location IS NOT NULL
                    AND posting_location != ''
                    AND is_deleted = 'N'
                ORDER BY posting_location ASC
            `;

            console.log(`[UniquePostingLocations] Executing query`);
            
            const [rows] = await db.promise.query(query);
            
            // Extract just the posting_location values into an array
            const postingLocations = rows.map(row => row.posting_location);
            
            console.log(`[UniquePostingLocations] Found ${postingLocations.length} unique locations`);

            callback(null, postingLocations);

        } catch (err) {
            console.error("[UniquePostingLocations] Error:", err);
            callback(err);
        }
    },

    shiftDetails: async (params, callback) => {
        console.log('* CB-API * Employee.shiftDetails Model Start ...');
        try {
            const { organization_id, emp_no } = params;

            console.log(`[ShiftDetails] Fetching shift details for employee: ${emp_no} in organization: ${organization_id}`);

            // First check if employee exists and get their shift
            const [employeeRows] = await db.promise.query(
                "SELECT shift FROM employee WHERE organization_id_fk = ? AND emp_no = ? AND is_deleted = 'N'",
                [organization_id, emp_no]
            );
            
            if (employeeRows.length === 0) {
                console.log(`[ShiftDetails] Employee not found`);
                return callback({ 
                    customError: true, 
                    message: "Employee not found",
                    error: "No data found for the provided employee number."
                });
            }

            const employee = employeeRows[0];

            // Get shift details from organization_time_table
            const [shiftRows] = await db.promise.query(
                `SELECT ott.* ,
                DATE_FORMAT(ott.create_datetime, '%Y-%m-%d %H:%i:%s') as create_datetime,
                DATE_FORMAT(ott.update_datetime, '%Y-%m-%d %H:%i:%s') as update_datetime
                FROM organization_time_table ott
                JOIN employee e ON ott.shift_code = e.shift 
                WHERE e.organization_id_fk = ? 
                AND e.emp_no = ? 
                AND ott.organization_id_fk = ?`,
                [organization_id, emp_no, organization_id]
            );

            if (shiftRows.length === 0) {
                console.log(`[ShiftDetails] No shift details found`);
                return callback({ 
                    customError: true, 
                    message: "Shift details not found",
                    error: "No matching shift details found in organization_time_table."
                });
            }

            console.log(`[ShiftDetails] Shift details retrieved successfully`);
            callback(null, shiftRows[0]);

        } catch (err) {
            console.error("[ShiftDetails] Error:", err);
            callback(err);
        }
    },
};
