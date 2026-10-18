<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
         <el-form-item label="名称" prop="name">
            <el-input
               v-model="queryParams.name"
               placeholder="请输入"
               clearable
               style="width: 200px"
               @keyup.enter="handleQuery"
            />
         </el-form-item>
         <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="请选择" clearable style="width: 200px">
               <el-option
                  v-for="dict in nursing_plan_status"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
               />
            </el-select>
         </el-form-item>
         <el-form-item>
            <el-button icon="Refresh" @click="resetQuery">重置</el-button>
            <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
         </el-form-item>
      </el-form>

      <div class="table-toolbar">
         <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
         <el-button
            type="primary"
            @click="handleAdd"
            v-hasPermi="['nursing:plan:add']"
         >新增护理计划</el-button>
      </div>

      <el-table v-loading="loading" :data="planList">
         <el-table-column label="序号" type="index" align="center" width="60" :index="indexMethod" />
         <el-table-column label="名称" align="center" prop="planName" :show-overflow-tooltip="true" />
         <el-table-column label="创建时间" align="center" prop="createTime" width="180">
            <template #default="scope">
               <span>{{ parseTime(scope.row.createTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="状态" align="center" prop="status" width="100">
            <template #default="scope">
               <dict-tag :options="planStatusOptions" :value="scope.row.status" />
            </template>
         </el-table-column>
         <el-table-column label="操作" width="240" align="center" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['nursing:plan:edit']">修改</el-button>
               <el-button link type="danger" @click="handleDelete(scope.row)" v-hasPermi="['nursing:plan:remove']">删除</el-button>
               <el-button link type="primary" @click="handleView(scope.row)" v-hasPermi="['nursing:plan:query']">查看</el-button>
               <el-button link type="primary" @click="handleStatusChange(scope.row)" v-hasPermi="['nursing:plan:edit']">
                  {{ isEnabled(scope.row.status) ? '禁用' : '启用' }}
               </el-button>
            </template>
         </el-table-column>
      </el-table>

      <pagination
         v-show="total > 0"
         :total="total"
         v-model:page="queryParams.pageNum"
         v-model:limit="queryParams.pageSize"
         @pagination="getList"
      />

      <!-- 添加、修改或查看护理计划对话框 -->
      <el-dialog :title="title" v-model="open" width="900px" append-to-body>
         <el-form ref="planRef" :model="form" :rules="rules" label-width="100px" :disabled="viewMode">
            <el-row>
               <el-col :span="12">
                  <el-form-item label="护理计划名称" prop="planName">
                     <el-input v-model="form.planName" maxlength="255" placeholder="请输入护理计划名称" />
                  </el-form-item>
               </el-col>
               <el-col :span="12">
                  <el-form-item label="排序号" prop="sortNo">
                     <el-input-number v-model="form.sortNo" :min="0" controls-position="right" style="width: 100%" />
                  </el-form-item>
               </el-col>
            </el-row>
            <el-row>
               <el-col :span="12">
                  <el-form-item label="状态" prop="status">
                     <el-radio-group v-model="form.status">
                        <el-radio
                           v-for="dict in nursing_plan_status"
                           :key="dict.value"
                           :value="dict.value"
                        >{{ dict.label }}</el-radio>
                     </el-radio-group>
                  </el-form-item>
               </el-col>
            </el-row>
            <el-form-item label="备注" prop="remark">
               <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="255" show-word-limit placeholder="请输入备注" />
            </el-form-item>
         </el-form>

         <el-divider content-position="left">护理项目明细</el-divider>
         <el-row :gutter="10" class="mb8" v-if="!viewMode">
            <el-col :span="1.5">
               <el-button type="primary" plain icon="Plus" @click="handleAddProjectPlan">添加护理项目</el-button>
            </el-col>
         </el-row>
         <el-table :data="form.projectPlans" border>
            <el-table-column label="护理项目" align="center" prop="projectId">
               <template #default="scope">
                  <span>{{ projectName(scope.row.projectId) }}</span>
               </template>
            </el-table-column>
            <el-table-column label="执行周期" align="center" prop="executeCycle" width="100">
               <template #default="scope">
                  <dict-tag :options="nursing_execute_cycle" :value="scope.row.executeCycle" />
               </template>
            </el-table-column>
            <el-table-column label="执行频次" align="center" prop="executeFrequency" width="100" />
            <el-table-column label="执行时间" align="center" prop="executeTime" width="120" />
            <el-table-column label="备注" align="center" prop="remark" :show-overflow-tooltip="true" />
            <el-table-column label="操作" align="center" width="80" v-if="!viewMode">
               <template #default="scope">
                  <el-button link type="primary" icon="Delete" @click="handleRemoveProjectPlan(scope.$index)">删除</el-button>
               </template>
            </el-table-column>
         </el-table>

         <template #footer>
            <div class="dialog-footer">
               <el-button v-if="!viewMode" type="primary" @click="submitForm">确 定</el-button>
               <el-button @click="cancel">{{ viewMode ? '关 闭' : '取 消' }}</el-button>
            </div>
         </template>
      </el-dialog>

      <!-- 护理项目明细编辑对话框 -->
      <el-dialog title="添加护理项目" v-model="projectPlanOpen" width="500px" append-to-body>
         <el-form ref="projectPlanRef" :model="projectPlanForm" :rules="projectPlanRules" label-width="100px">
            <el-form-item label="护理项目" prop="projectId">
               <el-select v-model="projectPlanForm.projectId" placeholder="请选择护理项目" style="width: 100%">
                  <el-option
                     v-for="item in projectOptions"
                     :key="item.value"
                     :label="item.label"
                     :value="item.value"
                  />
               </el-select>
            </el-form-item>
            <el-form-item label="执行周期" prop="executeCycle">
               <el-select v-model="projectPlanForm.executeCycle" placeholder="请选择执行周期" style="width: 100%">
                  <el-option
                     v-for="dict in nursing_execute_cycle"
                     :key="dict.value"
                     :label="dict.label"
                     :value="dict.value"
                  />
               </el-select>
            </el-form-item>
            <el-form-item label="执行频次" prop="executeFrequency">
               <el-input-number v-model="projectPlanForm.executeFrequency" :min="1" controls-position="right" style="width: 100%" />
            </el-form-item>
            <el-form-item label="执行时间" prop="executeTime">
               <el-time-picker
                  v-model="projectPlanForm.executeTime"
                  value-format="HH:mm:ss"
                  placeholder="请选择执行时间"
                  style="width: 100%"
               />
            </el-form-item>
            <el-form-item label="备注" prop="remark">
               <el-input v-model="projectPlanForm.remark" type="textarea" :rows="2" maxlength="255" show-word-limit placeholder="请输入备注" />
            </el-form-item>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" @click="submitProjectPlan">确 定</el-button>
               <el-button @click="projectPlanOpen = false">取 消</el-button>
            </div>
         </template>
      </el-dialog>
   </div>
</template>

<script setup name="NursingPlan">
import { listPlan, addPlan, delPlan, getPlan, updatePlan, changePlanStatus } from "@/api/nursing/plan"
import { listAllProject } from "@/api/nursing/project"

const { proxy } = getCurrentInstance()
const { nursing_plan_status, nursing_execute_cycle } = useDict("nursing_plan_status", "nursing_execute_cycle")

const planList = ref([])
const projectOptions = ref([])
const open = ref(false)
const projectPlanOpen = ref(false)
const viewMode = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const title = ref("")

const data = reactive({
  form: {},
  projectPlanForm: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    name: undefined,
    status: undefined
  },
  rules: {
    planName: [{ required: true, message: "护理计划名称不能为空", trigger: "blur" }],
    sortNo: [{ required: true, message: "排序号不能为空", trigger: "blur" }]
  },
  projectPlanRules: {
    projectId: [{ required: true, message: "护理项目不能为空", trigger: "change" }],
    executeCycle: [{ required: true, message: "执行周期不能为空", trigger: "change" }],
    executeFrequency: [{ required: true, message: "执行频次不能为空", trigger: "blur" }]
  }
})

const { queryParams, form, projectPlanForm, rules, projectPlanRules } = toRefs(data)

/** 状态标签：启用显示绿色、禁用显示红色 */
const planStatusOptions = computed(() =>
  nursing_plan_status.value.map(item => ({
    ...item,
    elTagType: String(item.value) === "1" ? "success" : "danger"
  }))
)

/** 序号跨页连续 */
function indexMethod(index) {
  return (queryParams.value.pageNum - 1) * queryParams.value.pageSize + index + 1
}

/** 是否启用 */
function isEnabled(status) {
  return String(status) === "1"
}

/** 根据护理项目ID取名称 */
function projectName(projectId) {
  const item = projectOptions.value.find(p => p.value === projectId)
  return item ? item.label : projectId
}

/** 加载护理项目下拉选项 */
function getProjectOptions() {
  listAllProject().then(response => {
    projectOptions.value = response.data
  })
}

/** 查询护理计划列表 */
function getList() {
  loading.value = true
  listPlan(queryParams.value).then(response => {
    planList.value = response.rows
    total.value = response.total
  }).finally(() => {
    loading.value = false
  })
}

/** 取消按钮 */
function cancel() {
  open.value = false
  reset()
}

/** 表单重置 */
function reset() {
  form.value = {
    id: undefined,
    planName: undefined,
    sortNo: 0,
    status: "1",
    remark: undefined,
    projectPlans: []
  }
  viewMode.value = false
  proxy.resetForm("planRef")
}

/** 搜索按钮操作 */
function handleQuery() {
  queryParams.value.pageNum = 1
  getList()
}

/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef")
  handleQuery()
}

/** 新增按钮操作 */
function handleAdd() {
  reset()
  open.value = true
  title.value = "添加护理计划"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  getPlan(row.id).then(response => {
    const data = response.data
    // 后端 status 为数字，字典值为字符串，统一转成字符串以便单选按钮正确回显
    form.value = { ...data, status: String(data.status), projectPlans: data.projectPlans || [] }
    open.value = true
    title.value = "修改护理计划"
  })
}

/** 查看按钮操作 */
function handleView(row) {
  reset()
  getPlan(row.id).then(response => {
    const data = response.data
    form.value = { ...data, status: String(data.status), projectPlans: data.projectPlans || [] }
    viewMode.value = true
    open.value = true
    title.value = "查看护理计划"
  })
}

/** 添加护理项目明细 */
function handleAddProjectPlan() {
  projectPlanForm.value = {
    projectId: undefined,
    executeCycle: "0",
    executeFrequency: 1,
    executeTime: undefined,
    remark: undefined
  }
  proxy.resetForm("projectPlanRef")
  projectPlanOpen.value = true
}

/** 确认添加护理项目明细 */
function submitProjectPlan() {
  proxy.$refs["projectPlanRef"].validate(valid => {
    if (valid) {
      form.value.projectPlans.push({ ...projectPlanForm.value })
      projectPlanOpen.value = false
    }
  })
}

/** 删除护理项目明细 */
function handleRemoveProjectPlan(index) {
  form.value.projectPlans.splice(index, 1)
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["planRef"].validate(valid => {
    if (valid) {
      if (form.value.id != undefined) {
        updatePlan(form.value).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addPlan(form.value).then(() => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

/** 启用/禁用 */
function handleStatusChange(row) {
  const enabled = isEnabled(row.status)
  const text = enabled ? "禁用" : "启用"
  proxy.$modal.confirm(`确认要${text}"${row.planName}"护理计划吗？`).then(function() {
    return changePlanStatus(row.id, enabled ? 0 : 1)
  }).then(() => {
    proxy.$modal.msgSuccess(text + "成功")
    getList()
  }).catch(() => {})
}

/** 删除按钮操作 */
function handleDelete(row) {
  proxy.$modal.confirm(`是否确认删除护理计划"${row.planName}"？`).then(function() {
    return delPlan(row.id)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

getProjectOptions()
getList()
</script>

<style scoped>
.table-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
</style>
