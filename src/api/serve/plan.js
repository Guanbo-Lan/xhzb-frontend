import request from '@/utils/request'

// 分页条件查询护理计划列表
export function listPlan(query) {
  return request({
    url: '/nursing/plan/list',
    method: 'get',
    params: query
  })
}

// 查询所有护理计划
export function listAllPlan() {
  return request({
    url: '/nursing/plan/all',
    method: 'get'
  })
}

// 根据id查询护理计划（含护理项目明细）
export function getPlan(id) {
  return request({
    url: '/nursing/plan/' + id,
    method: 'get'
  })
}

// 新增护理计划
export function addPlan(data) {
  return request({
    url: '/nursing/plan',
    method: 'post',
    data: data
  })
}

// 修改护理计划
export function updatePlan(data) {
  return request({
    url: '/nursing/plan',
    method: 'put',
    data: data
  })
}

// 修改护理计划状态（启用/禁用）
export function changePlanStatus(id, status) {
  return request({
    url: '/nursing/plan/changeStatus',
    method: 'put',
    data: { id, status }
  })
}

// 删除护理计划（支持单个ID或ID数组）
export function delPlan(id) {
  const ids = Array.isArray(id) ? id.join(',') : id
  return request({
    url: '/nursing/plan/' + ids,
    method: 'delete'
  })
}
