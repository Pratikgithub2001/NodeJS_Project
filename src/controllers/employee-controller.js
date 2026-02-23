import { validationResult, check } from "express-validator";
import { EmployeeModel } from "../models/employee-model.js";

const formatResponse = (status, message, error = null, data = null) => ({
    status, message, error, data
});

const getCurrentDateTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000; // offset in milliseconds
    const localTime = new Date(now - offset);
    return localTime.toISOString().slice(0, 19).replace('T', ' ');
};

export const list = (req, res) => {
    console.log('* CB-API * Employee.list Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.list - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    EmployeeModel.list(req.query, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(200).json(formatResponse(0, "Database error", err.message));
        }

        if (data.results && data.results.length > 0) {
            let aadhaarMsg = "";
            if (data.aadhaar_not_assigned_count > 0) {
                aadhaarMsg = `${data.aadhaar_not_assigned_count} employee (${data.aadhaar_missing.join(', ')}) don't have an Aadhaar number assigned.`;
            }

            let locMsg = "";
            if (data.loc_missing.length > 0) {
                locMsg = `${data.loc_missing.length} employee (${data.loc_missing.join(', ')}) don't have a Posting Location assigned.`;
            }

            res.status(200).json(formatResponse(1, "Success", null, {
                result: data.results,
                aadhaar_not_assigned_count: data.aadhaar_not_assigned_count,
                aadhaar_not_provided_message: aadhaarMsg,
                loc_not_assigned_count: data.loc_missing.length,
                loc_not_assigned_message: locMsg
            }));
        } else {
            console.log('* CB-API * Employee.list_get - No records found');
            res.status(200).json(formatResponse(0, "Employee record not found", "No data found for the selected state/location."));
        }
    });
};

export const view = (req, res) => {
    console.log('* CB-API * Employee.view Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.view - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    EmployeeModel.view(req.query.emp_id, (err, results) => {
        if (err) return res.status(200).json(formatResponse(0, "Database error", err.message));
        if (results.length === 0) return res.status(200).json(formatResponse(0, "Employee not found"));

        res.status(200).json({
            status: 1,
            response: results[0]
        });
    });
};

export const add = (req, res) => {
    console.log('* CB-API * Employee.add Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.add - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    // Additional date validations (matching PHP code)
    const { dob, date_of_joining, probation_period_end_date } = req.body;

    // Check if date of birth is not a future date
    if (dob && new Date(dob) > new Date()) {
        return res.status(200).json(formatResponse(0, 
            'Date of birth cannot be a future date.', 
            'Invalid date provided.'
        ));
    }

    // Check if probation period end date is not earlier than date of joining
    if (probation_period_end_date && date_of_joining && 
        new Date(probation_period_end_date) < new Date(date_of_joining)) {
        return res.status(200).json(formatResponse(0, 
            'Probation period end date cannot be earlier than date of joining.', 
            'Invalid date provided.'
        ));
    }

    // Trim string values and process data
    const trimmedData = {
        ...req.body,
        fname: req.body.fname?.trim(),
        mname: req.body.mname?.trim(),
        lname: req.body.lname?.trim(),
        bank_ifsc: req.body.bank_ifsc?.trim(),
        address_current: req.body.address_current?.replace(/'/g, '"'), // Replace single quotes with double quotes
        address_permanent: req.body.address_permanent?.replace(/'/g, '"')
    };

    EmployeeModel.add(trimmedData, (err, result) => {
        if (err) {
            const msg = err.customError ? err.message : "An unexpected error occurred.";
            return res.status(200).json(formatResponse(0, msg, err.message || err));
        }
        res.status(200).json(formatResponse(1, "Employee added successfully", null, "Success"));
    });
};

export const updatePersonalDetails = (req, res) => {
    console.log('* CB-API * Employee.updatePersonalDetails Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.updatePersonalDetails - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    EmployeeModel.updatePersonalDetails(req.body.employee_id, req.body, (err, result) => {
        if (err) {
            const msg = err.customError ? err.message : "An unexpected error occurred while updating employee details.";
            return res.status(200).json(formatResponse(0, msg, err.message || err));
        }
        res.status(200).json(formatResponse(1, "Employee personal details updated successfully.", null, "Success"));
    });
};

export const updateWorkDetails = (req, res) => {
    console.log('* CB-API * Employee.updateWorkDetails Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.updateWorkDetails - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    EmployeeModel.updateWorkDetails(req.body.employee_id, req.body, (err, result) => {
        if (err) {
            const msg = err.customError ? err.message : "An unexpected error occurred while updating employee work details.";
            return res.status(200).json(formatResponse(0, msg, err.message || err));
        }
        res.status(200).json(formatResponse(1, "Employee work details updated successfully.", null, "Success"));
    });
};

export const updateSalaryDetails = (req, res) => {
    console.log('* CB-API * Employee.updateSalaryDetails Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.updateSalaryDetails - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    EmployeeModel.updateSalaryDetails(req.body, (err, result) => {
        if (err) {
            const msg = err.customError ? err.message : "An unexpected error occurred while updating employee salary details.";
            return res.status(200).json(formatResponse(0, msg, err.message || err));
        }
        
        if (result === true) {
            res.status(200).json(formatResponse(1, "Employee salary details updated successfully.", null, "Success"));
        } else {
            res.status(200).json(formatResponse(0, "No changes were made to the employee salary details.", "No updates applied - data may be identical to existing records."));
        }
    });
};

export const nameList = (req, res) => {
    console.log('* CB-API * Employee.nameList Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.nameList - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    const { organization_id, month, year, status } = req.query;

    console.log(`[NameList] Fetching employee names for organization: ${organization_id}, month: ${month}, year: ${year}, status: ${status}`);

    EmployeeModel.nameList({ organization_id, month, year, status }, (err, result) => {
        if (err) {
            console.error("[NameList] Database error:", err);
            return res.status(200).json(formatResponse(0, "Database error", err.message));
        }

        res.status(200).json(formatResponse(1, "Success", null, result));
    });
};

export const listNotInLeaveMaster = (req, res) => {
    console.log('* CB-API * Employee.listNotInLeaveMaster Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.listNotInLeaveMaster - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    const { organization_id, logedInUserRole, logedInEmpNo, logedInEmpId } = req.query;

    console.log(`[ListNotInLeaveMaster] Fetching employees not in leave master for organization: ${organization_id}`);
    console.log(`[ListNotInLeaveMaster] User context - Role: ${logedInUserRole}, EmpNo: ${logedInEmpNo}, EmpId: ${logedInEmpId}`);

    EmployeeModel.listNotInLeaveMaster({ organization_id }, (err, result) => {
        if (err) {
            console.error("[ListNotInLeaveMaster] Database error:", err);
            return res.status(200).json(formatResponse(0, "Database error", err.message));
        }

        if (result && result.length > 0) {
            res.status(200).json(formatResponse(1, "Successfully fetched employee name", null, result));
        } else {
            res.status(200).json(formatResponse(0, "No employees available to assign leave master", "No employees available to assign leave master"));
        }
    });
};

export const viewChangeLog = (req, res) => {
    console.log('* CB-API * Employee.viewChangeLog Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.viewChangeLog - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    const { organization_id, employee_id, type_of_change } = req.query;

    console.log(`[ViewChangeLog] Fetching change logs for organization: ${organization_id}`);
    console.log(`[ViewChangeLog] Filters - Employee ID: ${employee_id}, Type: ${type_of_change}`);

    EmployeeModel.viewChangeLog({ organization_id, employee_id, type_of_change }, (err, result) => {
        if (err) {
            console.error("[ViewChangeLog] Database error:", err);
            return res.status(200).json(formatResponse(0, "Database error", err.message));
        }

        if (result && result.change_log && result.change_log.length > 0) {
            res.status(200).json(formatResponse(1, "Success", null, {
                change_log: result.change_log,
                employee_change_types: result.employee_change_types
            }));
        } else {
            res.status(200).json(formatResponse(0, "Failed to change employees log", "Failed to employees change log portal"));
        }
    });
};

export const updateStatus = (req, res) => {
    console.log('* CB-API * Employee.updateStatus Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.updateStatus - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    const { employee_id, status, reason, date_of_leaving, your_emp_id, logedInEmpNo } = req.body;

    console.log(`[UpdateStatus] Updating status for employee ID: ${employee_id}`);
    console.log(`[UpdateStatus] New status: ${status}, Reason: ${reason}, Date of leaving: ${date_of_leaving}`);

    EmployeeModel.updateStatus({ employee_id, status, reason, date_of_leaving, your_emp_id, logedInEmpNo }, (err, result) => {
        if (err) {
            const msg = err.customError ? err.message : "An unexpected error occurred while updating employee status.";
            return res.status(200).json(formatResponse(0, msg, err.message || err));
        }

        if (result && result.success) {
            // Status mapping for message
            const statusMessages = {
                1: 'Successfully activated',
                2: 'Temporarily deactivated',
                3: 'Left Company',
                4: 'Retired'
            };
            
            const message = statusMessages[status] || reason;
            
            // Return exact format as specified
            res.status(200).json({
                status: 1,
                message: message,
                error: null,
                data: true
            });
        } else {
            res.status(200).json(formatResponse(0, "Failed to update employee status.", "No changes were made to the employee record."));
        }
    });
};

export const viewTeamMembers = (req, res) => {
    console.log('* CB-API * Employee.viewTeamMembers Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.viewTeamMembers - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    const { emp_no } = req.query;

    console.log(`[ViewTeamMembers] Fetching team members for manager emp_no: ${emp_no}`);

    EmployeeModel.viewTeamMembers({ emp_no }, (err, result) => {
        if (err) {
            console.error("[ViewTeamMembers] Database error:", err);
            return res.status(200).json(formatResponse(0, "Database error", err.message));
        }

        if (result && result.length > 0) {
            res.status(200).json({
                status: 1,
                message: "Success",
                error: null,
                data: result
            });
        } else {
            res.status(200).json({
                status: 0,
                message: "Unable to view team members",
                error: "No team members found",
                data: null
            });
        }
    });
};

export const assignTeamMember = (req, res) => {
    console.log('* CB-API * Employee.assignTeamMember Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.assignTeamMember - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    const { emp_no, manager_empid } = req.body;

    console.log(`[AssignTeamMember] Assigning employee ${emp_no} to manager ${manager_empid}`);

    EmployeeModel.assignTeamMember({ emp_no, manager_empid }, (err, result) => {
        if (err) {
            console.error("[AssignTeamMember] Database error:", err);
            const msg = err.customError ? err.message : "An unexpected error occurred while assigning team member.";
            return res.status(200).json(formatResponse(0, msg, err.message || err));
        }

        if (result && result.success) {
            res.status(200).json({
                status: 1,
                message: "Employee successfully assigned to manager",
                error: null,
                data: true
            });
        } else {
            res.status(200).json({
                status: 0,
                message: "Team member already exists",
                error: "Team member already exists",
                data: null
            });
        }
    });
};

export const removeTeamMember = (req, res) => {
    console.log('* CB-API * Employee.removeTeamMember Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.removeTeamMember - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    const { emp_no } = req.body;

    console.log(`[RemoveTeamMember] Removing team member with emp_no: ${emp_no}`);

    EmployeeModel.removeTeamMember({ emp_no }, (err, result) => {
        if (err) {
            console.error("[RemoveTeamMember] Database error:", err);
            const msg = err.customError ? err.message : "An unexpected error occurred while removing team member.";
            return res.status(200).json(formatResponse(0, msg, err.message || err));
        }

        if (result && result.success) {
            res.status(200).json({
                status: 1,
                message: "Employee successfully removed",
                error: null,
                data: true
            });
        } else {
            res.status(200).json({
                status: 0,
                message: "Failed to remove employee from manager",
                error: "Failed to remove employee from manager",
                data: null
            });
        }
    });
};

export const managerList = (req, res) => {
    console.log('* CB-API * Employee.managerList Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.managerList - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    const { organization_id, logedInUserRole, logedInEmpNo, logedInEmpId } = req.query;

    console.log(`[ManagerList] Fetching managers for organization: ${organization_id}`);
    console.log(`[ManagerList] User context - Role: ${logedInUserRole}, EmpNo: ${logedInEmpNo}, EmpId: ${logedInEmpId}`);

    EmployeeModel.managerList({ organization_id }, (err, result) => {
        if (err) {
            console.error("[ManagerList] Database error:", err);
            return res.status(200).json(formatResponse(0, "Database error", err.message));
        }

        if (result && result.length > 0) {
            res.status(200).json({
                status: 1,
                message: "Success",
                error: null,
                data: result
            });
        } else {
            res.status(200).json({
                status: 0,
                message: "Failed to fetch manager name",
                error: "Unable to fetch manager name",
                data: null
            });
        }
    });
};

export const generateEmployeeNo = (req, res) => {
    console.log('* CB-API * Employee.generateEmployeeNo Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.generateEmployeeNo - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    const { organization_id, logedInEmpNo } = req.body;

    console.log(`[GenerateEmployeeNo] Generating employee number for organization: ${organization_id}`);

    EmployeeModel.generateEmployeeNo({ organization_id, logedInEmpNo }, (err, result) => {
        if (err) {
            console.error("[GenerateEmployeeNo] Error:", err);
            const msg = err.customError ? err.message : "Failed to generate Employee No.";
            return res.status(200).json(formatResponse(0, msg, "An error occurred while generating the Employee No."));
        }

        res.status(200).json({
            status: 1,
            message: "Employee No generated successfully.",
            error: null,
            data: {
                new_employee_no: result.new_employee_no,
                last_employee_no: result.last_employee_no || 'None'
            }
        });
    });
};

export const deleteEmployee = (req, res) => {
    console.log('* CB-API * Employee.deleteEmployee Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.deleteEmployee - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    const { employee_id, emp_no, logedInEmpNo } = req.body;

    console.log(`[DeleteEmployee] Deleting employee ID: ${employee_id}, Emp No: ${emp_no}`);

    EmployeeModel.deleteEmployee({ employee_id, emp_no, logedInEmpNo }, (err, result) => {
        if (err) {
            console.error("[DeleteEmployee] Error:", err);
            
            // Check if it's a custom error (like employee not found)
            if (err.customError) {
                return res.status(200).json(formatResponse(0, err.message, err.error || err.message));
            }
            
            return res.status(200).json(formatResponse(0, "Failed to delete employee.", "Transaction failed."));
        }

        res.status(200).json({
            status: 1,
            message: "Employee deleted successfully.",
            error: null,
            data: { emp_no: emp_no }
        });
    });
};

export const search = (req, res) => {
    console.log('* CB-API * Employee.search Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.search - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    const { organization_id, search_input, search_by } = req.query;

    console.log(`[Search] Searching employees by ${search_by}: ${search_input} for organization: ${organization_id}`);

    EmployeeModel.search({ organization_id, search_input, search_by }, (err, result) => {
        if (err) {
            console.error("[Search] Database error:", err);
            return res.status(200).json(formatResponse(0, "Database error", err.message));
        }

        if (result && result.length > 0) {
            res.status(200).json({
                status: 1,
                message: "Success",
                error: null,
                data: {
                    result: result
                }
            });
        } else {
            res.status(200).json({
                status: 0,
                message: "Unable to fetch employee list",
                error: "No search record found.",
                data: null
            });
        }
    });
};

export const uniquePostingLocations = (req, res) => {
    console.log('* CB-API * Employee.uniquePostingLocations Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.uniquePostingLocations - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    const { organization_id } = req.query;

    console.log(`[UniquePostingLocations] Fetching unique posting locations for organization: ${organization_id}`);

    EmployeeModel.uniquePostingLocations({ organization_id }, (err, result) => {
        if (err) {
            console.error("[UniquePostingLocations] Database error:", err);
            return res.status(200).json(formatResponse(0, "Failed to retrieve posting locations.", "Database error occurred."));
        }

        if (result && result.length > 0) {
            res.status(200).json({
                status: 1,
                message: "Unique posting locations retrieved successfully.",
                error: null,
                data: result
            });
        } else {
            res.status(200).json({
                status: 1,
                message: "No posting locations found for the specified organization.",
                error: null,
                data: []
            });
        }
    });
};

export const shiftDetails = (req, res) => {
    console.log('* CB-API * Employee.shiftDetails Start ...');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array().map(e => e.msg).join(' ');
        console.log('* CB-API * Employee.shiftDetails - Validation failed: ' + errorMsg);
        return res.status(200).json(formatResponse(0, errorMsg, errorMsg));
    }

    const { organization_id, emp_no } = req.query;

    console.log(`[ShiftDetails] Fetching shift details for employee: ${emp_no} in organization: ${organization_id}`);

    EmployeeModel.shiftDetails({ organization_id, emp_no }, (err, result) => {
        if (err) {
            console.error("[ShiftDetails] Database error:", err);
            
            // Check if it's a custom error (like employee not found)
            if (err.customError) {
                return res.status(200).json(formatResponse(0, err.message, err.error));
            }
            
            return res.status(200).json(formatResponse(0, "Database error", err.message));
        }

        res.status(200).json({
            status: 1,
            message: "Shift details retrieved successfully.",
            error: null,
            data: result
        });
    });
};
// Validation regex patterns matching PHP code
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX = /^[A-Z][a-zA-Z\s]*$/; // Starts with capital, only letters and spaces
const ADDRESS_REGEX = /^[a-zA-Z0-9\s,.-]+$/; // Alphanumeric with spaces, commas, dots, hyphens
const BANK_NAME_REGEX = /^[a-zA-Z\s]+$/; // Only alphabets and spaces

export const validate = (method) => {
    switch (method) {
        case 'list': return [
            check('organization_id', 'Organization ID must be a valid number.').isNumeric().isLength({ max: 2 }),
            check('status', 'Status must be a valid number.').optional({ checkFalsy: true }).isNumeric().isLength({ max: 2 })
        ];
        
        case 'view': return [
            check('organization_id', 'Organization ID must be a valid number.').isNumeric().isLength({ max: 2 }),
            check('emp_no', 'Employee Number cannot exceed 20 digits.').optional({ checkFalsy: true }).isLength({ max: 20 }),
            check('emp_id', 'Employee ID cannot exceed 11 digits.').optional({ checkFalsy: true }).isLength({ max: 11 })
        ];
        
        case 'add': return [
            // Required fields
            check('organization_id', 'Organization ID is required.').notEmpty(),
            check('logedInEmpNo', 'Logged in employee number is required.').notEmpty(),
            check('mobile', 'Please enter your mobile number.').notEmpty(),
            check('aadhaar_no', 'Please enter your aadhaar number.').notEmpty(),
            check('email', 'Please enter your email.').notEmpty(),
            check('emp_no', 'Employee number is required.').notEmpty(),
            check('fname', 'Please enter your first name.').notEmpty(),
            check('lname', 'Please enter your last name.').notEmpty(),
            check('gender', 'Gender is required.').notEmpty(),
            check('dob', 'Date of birth is required.').notEmpty(),
            check('address_current', 'Please enter your current address.').notEmpty(),
            check('address_permanent', 'Please enter your permanent address.').notEmpty(),
            check('date_of_joining', 'Date of joining is required.').notEmpty(),

            // Email validation
            check('email')
                .matches(EMAIL_REGEX).withMessage('Please enter a valid email address.')
                .isLength({ max: 50 }).withMessage('Please ensure email cannot exceed 50 characters.'),

            check('email_office')
                .optional({ checkFalsy: true })
                .matches(EMAIL_REGEX).withMessage('Please enter a valid office email.')
                .isLength({ max: 50 }).withMessage('Please ensure office email cannot exceed 50 characters.'),

            // Mobile number validation
            check('mobile')
                .isLength({ min: 10, max: 10 }).withMessage('Mobile number must be exactly 10 digits long.')
                .isNumeric().withMessage('Mobile number must contain only numbers.'),

            check('emerg_contact_number')
                .optional({ checkFalsy: true })
                .isLength({ min: 10, max: 10 }).withMessage('Emergency contact number must be exactly 10 digits long.')
                .isNumeric().withMessage('Emergency contact number must contain only numbers.'),

            // Aadhaar validation
            check('aadhaar_no')
                .isLength({ min: 12, max: 12 }).withMessage('Aadhaar number must be exactly 12 digits long.')
                .isNumeric().withMessage('Aadhaar number must contain only numbers.'),

            // Address validation
            check('address_permanent')
                .matches(ADDRESS_REGEX).withMessage('Permanent address must be alphanumeric and can contain spaces, commas, dots, and hyphens.')
                .isLength({ max: 150 }).withMessage('Permanent address cannot exceed 150 characters.'),

            check('address_current')
                .matches(ADDRESS_REGEX).withMessage('Current address must be alphanumeric and can contain spaces, commas, dots, and hyphens.')
                .isLength({ max: 150 }).withMessage('Current address cannot exceed 150 characters.'),

            // Name validations
            check('fname')
                .matches(NAME_REGEX).withMessage('First name must start with a capital letter and contain only letters and spaces.')
                .isLength({ max: 30 }).withMessage('First name cannot exceed 30 characters.'),

            check('mname')
                .optional({ checkFalsy: true })
                .matches(NAME_REGEX).withMessage('Middle name must start with a capital letter and contain only letters and spaces.')
                .isLength({ max: 30 }).withMessage('Middle name cannot exceed 30 characters.'),

            check('lname')
                .matches(NAME_REGEX).withMessage('Last name must start with a capital letter and contain only letters and spaces.')
                .isLength({ max: 30 }).withMessage('Last name cannot exceed 30 characters.'),

            check('emerg_contact_name')
                .optional({ checkFalsy: true })
                .matches(NAME_REGEX).withMessage('Emergency contact name must start with a capital letter and contain only letters with proper spacing.')
                .isLength({ max: 30 }).withMessage('Emergency contact name cannot exceed 30 characters.'),

            check('emerg_contact_relation')
                .optional({ checkFalsy: true })
                .matches(NAME_REGEX).withMessage('Emergency contact relation must start with a capital letter and contain only letters with proper spacing.')
                .isLength({ max: 30 }).withMessage('Emergency contact relation cannot exceed 30 characters.'),

            // UAN validation
            check('uan_no')
                .optional({ checkFalsy: true })
                .isLength({ min: 12, max: 12 }).withMessage('UAN number must be exactly 12 digits long.')
                .isNumeric().withMessage('UAN number must contain only numbers.'),

            // ESIC validation
            check('esic_no')
                .optional({ checkFalsy: true })
                .isLength({ min: 10, max: 10 }).withMessage('ESIC number must be exactly 10 digits long.')
                .isNumeric().withMessage('ESIC number must contain only numbers.'),

            // Bank account validation
            check('bank_accnt_no')
                .optional({ checkFalsy: true })
                .isLength({ min: 9, max: 18 }).withMessage('Bank account number must be between 9 and 18 digits long.')
                .isNumeric().withMessage('Bank account number must contain only numbers.'),

            // Bank IFSC validation
            check('bank_ifsc')
                .optional({ checkFalsy: true })
                .isLength({ min: 11, max: 11 }).withMessage('Bank IFSC code must be exactly 11 characters long.')
                .isAlphanumeric().withMessage('Bank IFSC code must contain only letters and numbers.'),

            // Bank name validation
            check('bank_name')
                .optional({ checkFalsy: true })
                .matches(BANK_NAME_REGEX).withMessage('Bank name must contain only alphabets and spaces.')
                .isLength({ max: 50 }).withMessage('Bank name cannot exceed 50 characters.'),

            check('bank_branch')
                .optional({ checkFalsy: true })
                .matches(BANK_NAME_REGEX).withMessage('Bank branch must contain only alphabets and spaces.')
                .isLength({ max: 50 }).withMessage('Bank branch cannot exceed 50 characters.'),

            // PAN validation
            check('pan_no')
                .optional({ checkFalsy: true })
                .isLength({ min: 10, max: 10 }).withMessage('Pan Number must be exactly 10 characters long.')
                .isAlphanumeric().withMessage('Pan Number must contain only letters and numbers.'),

            // Numeric validations
            check('is_manager')
                .optional({ checkFalsy: true })
                .isNumeric().withMessage('Is manager must be a number.'),

            check('designation_code')
                .optional({ checkFalsy: true })
                .isNumeric().withMessage('Designation code must be a number.'),

            check('level_code')
                .optional({ checkFalsy: true })
                .isNumeric().withMessage('Level code must be a number.')
        ];
        
        case 'updatePersonal': return [
            check('employee_id', 'Employee ID is required.').notEmpty(),
            check('logedInEmpNo', 'Logged in employee number is required.').notEmpty(),
            check('email', 'Please enter a valid email address.').matches(EMAIL_REGEX).isLength({ max: 50 }),
            check('email_office', 'Please enter a valid office email.').optional({ checkFalsy: true }).matches(EMAIL_REGEX).isLength({ max: 50 }),
            check('mobile', 'Mobile number must be exactly 10 digits long.').isNumeric().isLength({ min: 10, max: 10 }),
            check('emerg_contact_number', 'Emergency contact number must be exactly 10 digits long.').optional({ checkFalsy: true }).isNumeric().isLength({ min: 10, max: 10 }),
            check('aadhaar_no', 'Aadhaar number must be exactly 12 digits long.').isNumeric().isLength({ min: 12, max: 12 }),
            check('fname', 'First name must start with a capital letter and contain only letters and spaces.').matches(NAME_REGEX).isLength({ max: 30 }),
            check('mname', 'Middle name must start with a capital letter and contain only letters and spaces.').optional({ checkFalsy: true }).matches(NAME_REGEX).isLength({ max: 30 }),
            check('lname', 'Last name must start with a capital letter and contain only letters and spaces.').matches(NAME_REGEX).isLength({ max: 30 }),
            check('address_permanent', 'Permanent address must be alphanumeric and can contain spaces, commas, dots, and hyphens.').matches(ADDRESS_REGEX).isLength({ max: 150 }),
            check('address_current', 'Current address must be alphanumeric and can contain spaces, commas, dots, and hyphens.').matches(ADDRESS_REGEX).isLength({ max: 150 }),
            check('emerg_contact_name', 'Emergency contact name must start with a capital letter and contain only letters with proper spacing.').optional({ checkFalsy: true }).matches(NAME_REGEX).isLength({ max: 30 }),
            check('emerg_contact_relation', 'Emergency contact relation must start with a capital letter and contain only letters with proper spacing.').optional({ checkFalsy: true }).matches(NAME_REGEX).isLength({ max: 30 })
        ];
        
        case 'updateWork': return [
            // Required fields
            check('employee_id', 'Employee ID is required.').notEmpty(),
            check('emp_no', 'Employee Number is required.').notEmpty(),
            check('logedInEmpNo', 'Logged in employee number is required.').notEmpty(),

            // Date validations
            check('date_of_joining')
                .optional({ checkFalsy: true })
                .isDate().withMessage('Invalid date format for date of joining.'),
            
            check('probation_period_end_date')
                .optional({ checkFalsy: true })
                .isDate().withMessage('Invalid date format for probation period end date.'),

            // Numeric validations
            check('is_manager')
                .optional({ checkFalsy: true })
                .isNumeric().withMessage('Is manager must be a number.')
                .isIn([0, 1]).withMessage('Is manager must be 0 or 1.'),

            check('level_code')
                .optional({ checkFalsy: true })
                .isNumeric().withMessage('Level code must be a number.'),

            check('designation_code')
                .optional({ checkFalsy: true })
                .isNumeric().withMessage('Designation code must be a number.'),

            // String validations
            check('shift')
                .optional({ checkFalsy: true })
                .isLength({ max: 50 }).withMessage('Shift cannot exceed 50 characters.'),

            check('department_code')
                .optional({ checkFalsy: true })
                .isLength({ max: 50 }).withMessage('Department code cannot exceed 50 characters.'),

            check('posting_location')
                .optional({ checkFalsy: true })
                .isLength({ max: 100 }).withMessage('Posting location cannot exceed 100 characters.'),

            check('employee_type')
                .optional({ checkFalsy: true })
                .isLength({ min: 1, max: 1 }).withMessage('Employee type must be a single character.')
                .isIn(['F', 'P', 'C', 'T']).withMessage('Employee type must be one of: F (Full Time), P (Part Time), C (Contract), T (Trainee).'),

            check('manager_empid')
                .optional({ checkFalsy: true })
                .isLength({ max: 20 }).withMessage('Manager employee ID cannot exceed 20 characters.'),

            // Office location and rules (comma-separated strings)
            check('office_location')
                .optional({ checkFalsy: true })
                .matches(/^[A-Za-z0-9,_\s-]+$/).withMessage('Office locations should be comma-separated alphanumeric values.'),

            check('rule')
                .optional({ checkFalsy: true })
                .matches(/^[A-Za-z0-9,_\s-]+$/).withMessage('Rules should be comma-separated alphanumeric values.')
        ];

        case 'updateSalary': return [
            check('employee_id', 'Employee ID is required.').notEmpty(),
            check('logedInEmpNo', 'Logged in employee number is required.').notEmpty(),
            
            // UAN validation
            check('uan_no')
                .optional({ checkFalsy: true })
                .isLength({ min: 12, max: 12 }).withMessage('UAN number must be exactly 12 digits long.')
                .isNumeric().withMessage('UAN number must contain only numbers.'),

            // ESIC validation
            check('esic_no')
                .optional({ checkFalsy: true })
                .isLength({ min: 10, max: 10 }).withMessage('ESIC number must be exactly 10 digits long.')
                .isNumeric().withMessage('ESIC number must contain only numbers.'),

            // Bank account validation
            check('bank_accnt_no')
                .optional({ checkFalsy: true })
                .isLength({ min: 9, max: 18 }).withMessage('Bank account number must be between 9 and 18 digits long.')
                .isNumeric().withMessage('Bank account number must contain only numbers.'),

            // Bank IFSC validation
            check('bank_ifsc')
                .optional({ checkFalsy: true })
                .isLength({ min: 11, max: 11 }).withMessage('Bank IFSC code must be exactly 11 characters long.')
                .isAlphanumeric().withMessage('Bank IFSC code must contain only letters and numbers.')
                .trim(),

            // Bank name validation
            check('bank_name')
                .optional({ checkFalsy: true })
                .matches(BANK_NAME_REGEX).withMessage('Bank name must contain only alphabets and spaces.')
                .isLength({ max: 50 }).withMessage('Bank name cannot exceed 50 characters.'),

            check('bank_branch')
                .optional({ checkFalsy: true })
                .matches(BANK_NAME_REGEX).withMessage('Bank branch must contain only alphabets and spaces.')
                .isLength({ max: 50 }).withMessage('Bank branch cannot exceed 50 characters.'),

            // PAN validation
            check('pan_no')
                .optional({ checkFalsy: true })
                .isLength({ min: 10, max: 10 }).withMessage('Pan Number must be exactly 10 characters long.')
                .isAlphanumeric().withMessage('Pan Number must contain only letters and numbers.')
        ];
        
        case 'nameList': return [
            // Required fields
            check('organization_id', 'Organization ID is required.')
                .notEmpty()
                .isNumeric().withMessage('Organization ID must be a valid number.')
                .isLength({ max: 2 }).withMessage('Organization ID cannot exceed 2 digits.'),

            // Optional status validation
            check('status')
                .optional({ checkFalsy: true })
                .isNumeric().withMessage('Status must be a valid number.')
                .isLength({ max: 1 }).withMessage('Status cannot exceed 1 digit.')
                .isIn(['1', '2', '3', '4']).withMessage('Status must be either 1, 2, 3, or 4.'),

            // Optional month validation
            check('month')
                .optional({ checkFalsy: true })
                .isNumeric().withMessage('Month must be a valid number.')
                .isLength({ min: 1, max: 2 }).withMessage('Month must be 1-2 digits.')
                .isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12.'),

            // Optional year validation
            check('year')
                .optional({ checkFalsy: true })
                .isNumeric().withMessage('Year must be a valid number.')
                .isLength({ min: 4, max: 4 }).withMessage('Year must be exactly 4 digits.')
        ];

        case 'listNotInLeaveMaster': return [
            // Required fields
            check('organization_id', 'Organization ID is required.')
                .notEmpty()
                .isNumeric().withMessage('Organization ID must be a valid number.')
                .isLength({ max: 2 }).withMessage('Organization ID cannot exceed 2 digits.'),

            // Optional fields (for future use, but validated if provided)
            check('logedInUserRole')
                .optional({ checkFalsy: true })
                .isLength({ max: 50 }).withMessage('Logged in user role cannot exceed 50 characters.'),

            check('logedInEmpNo')
                .optional({ checkFalsy: true })
                .isLength({ max: 20 }).withMessage('Logged in employee number cannot exceed 20 characters.'),

            check('logedInEmpId')
                .optional({ checkFalsy: true })
                .isNumeric().withMessage('Logged in employee ID must be a number.')
                .isLength({ max: 11 }).withMessage('Logged in employee ID cannot exceed 11 digits.')
        ];
        
        case 'viewChangeLog': return [
            // Required fields
            check('organization_id', 'Organization ID is required.')
                .notEmpty()
                .isNumeric().withMessage('Organization ID must be a valid number.')
                .isLength({ max: 2 }).withMessage('Organization ID cannot exceed 2 digits.'),

            // Optional fields
            check('employee_id')
                .optional({ checkFalsy: true })
                .isNumeric().withMessage('Employee ID must be a valid number.')
                .isLength({ max: 11 }).withMessage('Employee ID cannot exceed 11 digits.'),
        ];
        
        case 'updateStatus': return [
            // Required fields
            check('employee_id', 'Employee ID is required.')
                .notEmpty()
                .isNumeric().withMessage('Employee ID must be a valid number.')
                .isLength({ max: 11 }).withMessage('Employee ID cannot exceed 11 digits.'),

            check('status', 'Status is required.')
                .notEmpty()
                .isNumeric().withMessage('Status must be a valid number.')
                .isLength({ max: 2 }).withMessage('Status cannot exceed 2 digits.')
                .isIn(['1', '2', '3', '4']).withMessage('Status must be 1 (Active), 2 (Temporary Deactivated), 3 (Left Company), or 4 (Retire).'),

            check('reason', 'Reason is required.')
                .notEmpty()
                .isLength({ max: 50 }).withMessage('Reason cannot exceed 50 characters.'),

            check('logedInEmpNo', 'Logged in employee number is required.')
                .notEmpty()
                .isLength({ max: 20 }).withMessage('Logged In Employee Number cannot exceed 20 characters.'),

            check('your_emp_id', 'Your employee ID is required.')
                .notEmpty()
                .isNumeric().withMessage('Your employee ID must be a valid number.')
                .isLength({ max: 11 }).withMessage('Your employee ID cannot exceed 11 digits.'),

            // Optional fields
            check('date_of_leaving')
                .optional({ checkFalsy: true })
                .isDate().withMessage('Invalid date format for date of leaving.')
        ];
        
        case 'viewTeamMembers': return [
            // Required fields
            check('emp_no', 'Employee Number is required.')
                .notEmpty()
                .isNumeric().withMessage('Employee number must be a valid number.')
                .isLength({ max: 20 }).withMessage('Employee number cannot exceed 20 digits.')
        ];
        
        case 'assignTeamMember': return [
            // Required fields
            check('emp_no', 'Employee Number is required.')
                .notEmpty()
                .isNumeric().withMessage('Employee number must be a valid number.')
                .isLength({ max: 20 }).withMessage('Employee number cannot exceed 20 digits.'),

            check('manager_empid', 'Manager Employee ID is required.')
                .notEmpty()
                .isNumeric().withMessage('Manager Employee ID must be a valid number.')
                .isLength({ max: 20 }).withMessage('Manager Employee ID cannot exceed 11 digits.')
        ];
        
        case 'removeTeamMember': return [
            // Required fields
            check('emp_no', 'Employee Number is required.')
                .notEmpty()
                .isNumeric().withMessage('Employee number must be a valid number.')
                .isLength({ max: 20 }).withMessage('Employee number cannot exceed 20 digits.')
        ];
        
        case 'managerList': return [
            // Required fields
            check('organization_id', 'Organization ID is required.')
                .notEmpty()
                .isNumeric().withMessage('Organization ID must be a valid number.')
                .isLength({ max: 2 }).withMessage('Organization ID cannot exceed 2 digits.'),

            // Optional fields (for future use, but validated if provided)
            check('logedInUserRole')
                .optional({ checkFalsy: true })
                .isLength({ max: 50 }).withMessage('Logged in user role cannot exceed 50 characters.'),

            check('logedInEmpNo')
                .optional({ checkFalsy: true })
                .isLength({ max: 20 }).withMessage('Logged in employee number cannot exceed 20 characters.'),

            check('logedInEmpId')
                .optional({ checkFalsy: true })
                .isNumeric().withMessage('Logged in employee ID must be a number.')
                .isLength({ max: 11 }).withMessage('Logged in employee ID cannot exceed 11 digits.')
        ];
        
        case 'generateEmployeeNo': return [
            // Required fields
            check('organization_id', 'Organization ID is required.')
                .notEmpty()
                .isNumeric().withMessage('Organization ID must be a valid number.')
                .isLength({ max: 2 }).withMessage('Organization ID cannot exceed 2 digits.'),

            check('logedInEmpNo', 'Logged in employee number is required.')
                .notEmpty()
                .isLength({ max: 20 }).withMessage('Logged in employee number cannot exceed 20 characters.')
        ];
        
        case 'delete': return [
            // Required fields
            check('employee_id', 'Employee ID is required.')
                .notEmpty()
                .isNumeric().withMessage('Employee ID must be a valid number.')
                .isLength({ max: 11 }).withMessage('Employee ID cannot exceed 11 digits.'),

            check('emp_no', 'Employee Number is required.')
                .notEmpty()
                .isNumeric().withMessage('Employee number must be a valid number.')
                .isLength({ max: 20 }).withMessage('Employee number cannot exceed 20 digits.'),

            check('logedInEmpNo', 'Logged in employee number is required.')
                .notEmpty()
                .isLength({ max: 20 }).withMessage('Logged in employee number cannot exceed 20 characters.')
        ];
        
        case 'search': return [
            // Required fields
            check('organization_id', 'Organization ID is required.')
                .notEmpty()
                .isNumeric().withMessage('Organization ID must be a valid number.')
                .isLength({ max: 2 }).withMessage('Organization ID cannot exceed 2 digits.'),

            check('search_input', 'Search input is required.')
                .notEmpty()
                .isLength({ max: 50 }).withMessage('Search input cannot exceed 50 characters.'),

            check('search_by', 'Search by field is required.')
                .notEmpty()
                .isIn(['aadhaar_no', 'pan_no', 'uan_no', 'esic_no']).withMessage('Search by must be one of: aadhaar_no, pan_no, uan_no, esic_no.')
        ];
        
        case 'uniquePostingLocations': return [
            // Required fields
            check('organization_id', 'Organization ID is required.')
                .notEmpty()
                .isNumeric().withMessage('Organization ID must be a valid number.')
                .isLength({ max: 2 }).withMessage('Organization ID cannot exceed 2 digits.')
        ];
        
        case 'shiftDetails': return [
            // Required fields
            check('organization_id', 'Organization ID is required.')
                .notEmpty()
                .isNumeric().withMessage('Organization ID must be a valid number.')
                .isLength({ max: 2 }).withMessage('Organization ID cannot exceed 2 digits.'),

            check('emp_no', 'Employee Number is required.')
                .notEmpty()
                .isLength({ max: 20 }).withMessage('Employee number cannot exceed 20 digits.')
        ];

        default: return [];
    }
};