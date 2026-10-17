<template>
   <div class="app-container">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch">
         <el-form-item label="等级名称" prop="name">
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
                  v-for="dict in nursing_level_status"
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
            v-hasPermi="['nursing:level:add']"
         >新增护理等级</el-button>
      </div>

      <el-table v-loading="loading" :data="levelList">
         <el-table-column label="序号" type="index" align="center" width="60" :index="indexMethod" />
         <el-table-column label="护理等级名称" align="center" prop="name" :show-overflow-tooltip="true" />
         <el-table-column label="执行护理计划" align="center" prop="nursingPlanName" :show-overflow-tooltip="true" />
         <el-table-column label="护理费用（元/月）" align="center" prop="fee" width="150">
            <template #default="scope">
               <span>{{ formatPrice(scope.row.fee) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="状态" align="center" prop="status" width="100">
            <template #default="scope">
               <dict-tag :options="levelStatusOptions" :value="scope.row.status" />
            </template>
         </el-table-column>
         <el-table-column label="等级说明" align="center" prop="description" :show-overflow-tooltip="true" />
         <el-table-column label="创建时间" align="center" prop="createTime" width="180">
            <template #default="scope">
               <span>{{ parseTime(scope.row.createTime) }}</span>
            </template>
         </el-table-column>
         <el-table-column label="操作" width="180" align="center" class-name="small-padding fixed-width">
            <template #default="scope">
               <el-button link type="primary" @click="handleUpdate(scope.row)" v-hasPermi="['nursing:level:edit']">修改</el-button>
               <el-button link type="danger" @click="handleDelete(scope.row)" v-hasPermi="['nursing:level:remove']">删除</el-button>
               <el-button link type="primary" @click="handleStatusChange(scope.row)" v-hasPermi="['nursing:level:edit']">
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

      <!-- 添加或修改护理等级对话框 -->
      <el-dialog :title="title" v-model="open" width="600px" append-to-body>
         <el-form ref="levelRef" :model="form" :rules="rules" label-width="110px">
            <el-form-item label="护理等级名称" prop="name">
               <el-input v-model="form.name" maxlength="50" placeholder="请输入护理等级名称" />
            </el-form-item>
            <el-form-item label="执行护理计划" prop="lplanId">
               <el-select v-model="form.lplanId" placeholder="请选择护理计划" style="width: 100%">
                  <el-option
                     v-for="item in planOptions"
                     :key="item.id"
                     :label="item.planName"
                     :value="item.id"
                  />
               </el-select>
            </el-form-item>
            <el-form-item label="护理费用（元/月）" prop="fee">
               <el-input-number v-model="form.fee" :precision="2" :min="0" controls-position="right" style="width: 100%" />
            </el-form-item>
            <el-form-item label="状态" prop="status">
               <el-radio-group v-model="form.status">
                  <el-radio
                     v-for="dict in nursing_level_status"
                     :key="dict.value"
                     :value="dict.value"
                  >{{ dict.label }}</el-radio>
               </el-radio-group>
            </el-form-item>
            <el-form-item label="等级说明" prop="description">
               <el-input v-model="form.description" type="textarea" :rows="3" maxlength="255" show-word-limit placeholder="请输入等级说明" />
            </el-form-item>
         </el-form>
         <template #footer>
            <div class="dialog-footer">
               <el-button type="primary" @click="submitForm">确 定</el-button>
               <el-button @click="cancel">取 消</el-button>
            </div>
         </template>
      </el-dialog>
   </div>
</template>

<script setup name="NursingLevel">
import { listLevel, addLevel, delLevel, getLevel, updateLevel, changeLevelStatus } from "@/api/serve/level"
import { listAllPlan } from "@/api/serve/plan"

const { proxy } = getCurrentInstance()
const { nursing_level_status } = useDict("nursing_level_status")

const levelList = ref([])
const planOptions = ref([])
const open = ref(false)
const loading = ref(true)
const showSearch = ref(true)
const total = ref(0)
const title = ref("")

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    name: undefined,
    status: undefined
  },
  rules: {
    name: [{ required: true, message: "护理等级名称不能为空", trigger: "blur" }],
    lplanId: [{ required: true, message: "护理计划不能为空", trigger: "change" }],
    fee: [{ required: true, message: "护理费用不能为空", trigger: "blur" }]
  }
})

const { queryParams, form, rules } = toRefs(data)

/** 状态标签：启用显示绿色、禁用显示红色 */
const levelStatusOptions = computed(() =>
  nursing_level_status.value.map(item => ({
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

/** 费用格式化为两位小数 */
function formatPrice(fee) {
  if (fee === null || fee === undefined || fee === "") {
    return "-"
  }
  return Number(fee).toFixed(2)
}

/** 加载护理计划下拉选项 */
function getPlanOptions() {
  listAllPlan().then(response => {
    planOptions.value = response.data
  })
}

/** 查询护理等级列表 */
function getList() {
  loading.value = true
  listLevel(queryParams.value).then(response => {
    levelList.value = response.rows
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
    name: undefined,
    lplanId: undefined,
    fee: 0,
    status: "1",
    description: undefined
  }
  proxy.resetForm("levelRef")
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
  title.value = "添加护理等级"
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset()
  getLevel(row.id).then(response => {
    // 后端 status 为数字，字典值为字符串，统一转成字符串以便单选按钮正确回显
    form.value = { ...response.data, status: String(response.data.status) }
    open.value = true
    title.value = "修改护理等级"
  })
}

/** 提交按钮 */
function submitForm() {
  proxy.$refs["levelRef"].validate(valid => {
    if (valid) {
      if (form.value.id != undefined) {
        updateLevel(form.value).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addLevel(form.value).then(() => {
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
  proxy.$modal.confirm(`确认要${text}"${row.name}"护理等级吗？`).then(function() {
    return changeLevelStatus(row.id, enabled ? 0 : 1)
  }).then(() => {
    proxy.$modal.msgSuccess(text + "成功")
    getList()
  }).catch(() => {})
}

/** 删除按钮操作 */
function handleDelete(row) {
  proxy.$modal.confirm(`是否确认删除护理等级"${row.name}"？`).then(function() {
    return delLevel(row.id)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

getPlanOptions()
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
