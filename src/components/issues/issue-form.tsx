'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IssueSchema } from '@/lib/validations/issues'
import type { IssueCategory } from '@/lib/db'

export interface IssueFormData {
  title: string
  description: string
  category: IssueCategory
  screenshotUrl?: string
}

interface IssueFormProps {
  onSubmit: (data: IssueFormData) => void
  isSubmitting?: boolean
  screenshotUrl?: string
  onRemoveScreenshot?: () => void
}

const CATEGORY_OPTIONS: { value: IssueCategory; label: string }[] = [
  { value: 'BUG', label: '버그' },
  { value: 'FEATURE', label: '기능추가' },
  { value: 'IMPROVEMENT', label: '기능수정' },
  { value: 'UI_UX', label: 'UI개선' },
  { value: 'DOCUMENTATION', label: '문서' },
]

export function IssueForm({
  onSubmit,
  isSubmitting = false,
  screenshotUrl,
  onRemoveScreenshot,
}: IssueFormProps) {
  const [formData, setFormData] = useState<IssueFormData>({
    title: '',
    description: '',
    category: 'BUG',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData((prev) => ({ ...prev, title: value }))
    if (errors.title) {
      setErrors((prev) => ({ ...prev, title: '' }))
    }
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setFormData((prev) => ({ ...prev, description: value }))
    if (errors.description) {
      setErrors((prev) => ({ ...prev, description: '' }))
    }
  }

  const handleCategoryChange = (value: IssueCategory) => {
    setFormData((prev) => ({ ...prev, category: value }))
    if (errors.category) {
      setErrors((prev) => ({ ...prev, category: '' }))
    }
  }

  const validate = (): boolean => {
    const result = IssueSchema.safeParse({
      title: formData.title,
      description: formData.description || undefined,
      category: formData.category,
      priority: 'MEDIUM',
    })
    
    if (result.success) {
      setErrors({})
      return true
    }
    
    const newErrors: Record<string, string> = {}
    const fieldErrors = result.error.flatten().fieldErrors
    
    if (fieldErrors.title?.[0]) {
      newErrors.title = fieldErrors.title[0]
    }
    if (fieldErrors.category?.[0]) {
      newErrors.category = fieldErrors.category[0]
    }
    if (fieldErrors.description?.[0]) {
      newErrors.description = fieldErrors.description[0]
    }
    
    setErrors(newErrors)
    return false
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    onSubmit({
      ...formData,
      screenshotUrl,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 제목 필드 */}
      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          placeholder="이슈 제목을 입력하세요"
          value={formData.title}
          onChange={handleTitleChange}
          maxLength={200}
          disabled={isSubmitting}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        {errors.title && (
          <p id="title-error" className="text-sm text-destructive">
            {errors.title}
          </p>
        )}
      </div>

      {/* 카테고리 필드 */}
      <div className="space-y-2">
        <Label htmlFor="category">카테고리</Label>
        <Select
          value={formData.category}
          onValueChange={handleCategoryChange}
          disabled={isSubmitting}
        >
          <SelectTrigger
            id="category"
            aria-invalid={!!errors.category}
            aria-describedby={errors.category ? 'category-error' : undefined}
          >
            <SelectValue placeholder="카테고리를 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && (
          <p id="category-error" className="text-sm text-destructive">
            {errors.category}
          </p>
        )}
      </div>

      {/* 설명 필드 */}
      <div className="space-y-2">
        <Label htmlFor="description">설명</Label>
        <Textarea
          id="description"
          placeholder="이슈에 대한 상세 설명을 입력하세요"
          value={formData.description}
          onChange={handleDescriptionChange}
          rows={5}
          maxLength={5000}
          disabled={isSubmitting}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
        />
        {errors.description && (
          <p id="description-error" className="text-sm text-destructive">
            {errors.description}
          </p>
        )}
      </div>

      {/* 스크린샷 미리보기 */}
      {screenshotUrl && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>첨부된 스크린샷</Label>
            {onRemoveScreenshot && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemoveScreenshot}
                disabled={isSubmitting}
              >
                삭제
              </Button>
            )}
          </div>
          <div className="relative overflow-hidden rounded-md border">
            <img
              src={screenshotUrl}
              alt="첨부된 스크린샷"
              className="max-h-40 w-auto object-contain"
            />
          </div>
        </div>
      )}

      {/* 제출 버튼 */}
      <div className="pt-4">
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? '등록 중...' : '이슈 등록하기'}
        </Button>
      </div>
    </form>
  )
}
