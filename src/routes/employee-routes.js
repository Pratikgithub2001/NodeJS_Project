import express from "express";
import multer from "multer";
const router = express.Router();
const upload = multer();
import {
  list, 
  view, 
  add, 
  updatePersonalDetails, 
  updateWorkDetails, 
  updateSalaryDetails,
  nameList,
  listNotInLeaveMaster,
  viewChangeLog,
  updateStatus,
  viewTeamMembers,
  assignTeamMember,
  removeTeamMember,
  managerList,
  generateEmployeeNo,
  deleteEmployee,
  search,
  uniquePostingLocations,
  shiftDetails,
  validate
} from "../controllers/employee-controller.js";



router.get("/list", validate('list'), list);
router.get("/view", validate('view'), view);
router.get("/name_list", validate('nameList'), nameList);
router.get("/list_not_in_leave_master", validate('listNotInLeaveMaster'), listNotInLeaveMaster); 
router.get("/view_change_log", validate('viewChangeLog'), viewChangeLog);
router.get("/view_team_members", validate('viewTeamMembers'), viewTeamMembers);
router.get("/manager_list", validate('managerList'), managerList);
router.get("/search", validate('search'), search);
router.get("/unique_posting_locations", validate('uniquePostingLocations'), uniquePostingLocations);
router.get("/shift_details", validate('shiftDetails'), shiftDetails);
router.post("/add", upload.none(), validate('add'), add);
router.post("/update_personal_details", upload.none(), validate('updatePersonal'), updatePersonalDetails);
router.post("/update_work_details", upload.none(), validate('updateWork'), updateWorkDetails);
router.post("/update_salary_details", upload.none(), validate('updateSalary'), updateSalaryDetails);
router.post("/update_status", upload.none(), validate('updateStatus'), updateStatus);
router.post("/assign_team_member", upload.none(), validate('assignTeamMember'), assignTeamMember); 
router.post("/remove_team_member", upload.none(), validate('removeTeamMember'), removeTeamMember); 
router.post("/generate_employee_no", upload.none(), validate('generateEmployeeNo'), generateEmployeeNo);
router.post("/delete", upload.none(), validate('delete'), deleteEmployee);


export default router;
