import request from '@/utils/request'

// 分页条件查询护理项目列表
export function listProject(query) {
  return request({
    url: '/nursing/project/list',
    method: 'get',
    params: query
  })
}

// 查询所有护理项目（下拉选项）
export function listAllProject() {
  return request({
    url: '/nursing/project/all',
    method: 'get'
  })
}

// 根据id查询护理项目
export function getProject(id) {
  return request({
    url: '/nursing/project/' + id,
    method: 'get'
  })
}

// 新增护理项目
export function addProject(data) {
  return request({
    url: '/nursing/project',
    method: 'post',
    data: data
  })
}

// 修改护理项目
export function updateProject(data) {
  return request({
    url: '/nursing/project',
    method: 'put',
    data: data
  })
}

// 修改护理项目状态（启用/禁用）
export function changeProjectStatus(id, status) {
  return request({
    url: '/nursing/project/changeStatus',
    method: 'put',
    data: { id, status }
  })
}

// 删除护理项目（支持单个ID或ID数组）
export function delProject(id) {
  const ids = Array.isArray(id) ? id.join(',') : id
  return request({
    url: '/nursing/project/' + ids,
    method: 'delete'
  })
}
