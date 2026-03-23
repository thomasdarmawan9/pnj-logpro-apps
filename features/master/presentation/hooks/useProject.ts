'use client'

import { useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import {
  fetchProjects, fetchProjectDetail, createProject, updateProject,
  openProjectForm, closeProjectForm, clearSelectedProject,
} from '@/store/slices/masterSlice'
import { Project } from '@/features/master/domain/entities/Project'

export function useProject() {
  const dispatch = useDispatch<AppDispatch>()
  const { projects, selectedProject, isLoading, error, modals } = useSelector((s: RootState) => s.master)

  useEffect(() => {
    if (projects.length === 0) dispatch(fetchProjects())
  }, [dispatch, projects.length])

  const loadDetail = useCallback((uuid: string) => dispatch(fetchProjectDetail(uuid)), [dispatch])
  const clearDetail = useCallback(() => dispatch(clearSelectedProject()), [dispatch])

  return {
    projects,
    selectedProject,
    isLoading,
    error,
    modal: modals.projectForm,
    openForm: (data: Project | null = null) => dispatch(openProjectForm(data)),
    closeForm: () => dispatch(closeProjectForm()),
    loadDetail,
    clearDetail,
    create: (data: Parameters<typeof createProject>[0]) => dispatch(createProject(data)),
    update: (uuid: string, data: Partial<Project>) => dispatch(updateProject({ uuid, data })),
    refresh: () => dispatch(fetchProjects()),
  }
}
