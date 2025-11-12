import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Plus, X, Trash2 } from 'lucide-react'

// Schema
const categoryAttributeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Attribute name is required'),
  type: z.enum(['text', 'number', 'boolean', 'date', 'select'], {
    required_error: 'Please select an attribute type',
  }),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
})

const categorySchema = z.object({
  code: z.string().min(1, 'Category code is required'),
  name: z.string().min(1, 'Category name is required'),
  description: z.string().min(1, 'Description is required'),
  parentCategoryId: z.string().optional(),
  isActive: z.boolean().default(true),
  attributes: z.array(categoryAttributeSchema).default([]),
})

type Category = z.infer<typeof categorySchema>
type CategoryAttribute = z.infer<typeof categoryAttributeSchema>

// Parent category interface
interface CategoryOption {
  id: string
  code: string
  name: string
  level: number
}

interface CategoryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Partial<Category>
  categories: CategoryOption[]
  onSubmit: (data: Category) => void
}

export default function CategoryForm({
  open,
  onOpenChange,
  initialData,
  categories,
  onSubmit
}: CategoryFormProps) {
  const [attributes, setAttributes] = useState<CategoryAttribute[]>(
    initialData?.attributes || []
  )
  const [newAttribute, setNewAttribute] = useState<Partial<CategoryAttribute>>({
    name: '',
    type: 'text',
    required: false,
    options: []
  })

  const form = useForm<Category>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      parentCategoryId: '',
      isActive: true,
      attributes: [],
    },
    values: {
      ...initialData,
      attributes: attributes,
      parentCategoryId: initialData?.parentCategoryId || '',
      isActive: initialData?.isActive ?? true,
    },
  })

  const handleSubmit = (data: Category) => {
    const finalData = {
      ...data,
      attributes,
    }
    onSubmit(finalData)
    onOpenChange(false)
    form.reset()
    setAttributes([])
    setNewAttribute({
      name: '',
      type: 'text',
      required: false,
      options: []
    })
  }

  const addAttribute = () => {
    if (newAttribute.name && newAttribute.type) {
      const attribute: CategoryAttribute = {
        id: Date.now().toString(),
        name: newAttribute.name,
        type: newAttribute.type,
        required: newAttribute.required || false,
        options: newAttribute.type === 'select' ? (newAttribute.options || []) : undefined
      }
      setAttributes([...attributes, attribute])
      setNewAttribute({
        name: '',
        type: 'text',
        required: false,
        options: []
      })
    }
  }

  const removeAttribute = (id: string) => {
    setAttributes(attributes.filter(attr => attr.id !== id))
  }

  const addOptionToNewAttribute = (option: string) => {
    if (option && !newAttribute.options?.includes(option)) {
      setNewAttribute({
        ...newAttribute,
        options: [...(newAttribute.options || []), option]
      })
    }
  }

  const removeOptionFromNewAttribute = (option: string) => {
    setNewAttribute({
      ...newAttribute,
      options: newAttribute.options?.filter(opt => opt !== option) || []
    })
  }

  const availableParentCategories = categories.filter(
    cat => !initialData?.id || cat.id !== initialData.id
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Category' : 'Add New Category'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update category information and attributes'
              : 'Create a new product category with custom attributes'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="PRODUCE" />
                      </FormControl>
                      <FormDescription>
                        Unique identifier for this category
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parentCategoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Category (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select parent category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Root Category (No Parent)</SelectItem>
                          {availableParentCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name} ({category.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select a parent category to create hierarchy
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Produce" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} placeholder="Fresh fruits and vegetables" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Category Attributes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Category Attributes</h3>
              <div className="space-y-4">
                {/* Existing Attributes */}
                {attributes.length > 0 && (
                  <div className="space-y-2">
                    <FormLabel>Current Attributes</FormLabel>
                    <div className="space-y-2">
                      {attributes.map((attribute, index) => (
                        <div key={attribute.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div>
                              <div className="font-medium">{attribute.name}</div>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Badge variant="outline">{attribute.type}</Badge>
                                {attribute.required && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                                {attribute.options && attribute.options.length > 0 && (
                                  <span>Options: {attribute.options.join(', ')}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttribute(attribute.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Add New Attribute */}
                <div className="space-y-3">
                  <FormLabel>Add New Attribute</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Input
                        placeholder="Attribute name"
                        value={newAttribute.name || ''}
                        onChange={(e) => setNewAttribute({
                          ...newAttribute,
                          name: e.target.value
                        })}
                      />
                    </div>
                    <Select
                      value={newAttribute.type}
                      onValueChange={(value: any) => setNewAttribute({
                        ...newAttribute,
                        type: value,
                        options: value === 'select' ? [] : undefined
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newAttribute.type === 'select' && (
                    <div className="space-y-2">
                      <FormLabel>Select Options</FormLabel>
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Add option"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              addOptionToNewAttribute(e.currentTarget.value)
                              e.currentTarget.value = ''
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement
                            if (input.value) {
                              addOptionToNewAttribute(input.value)
                              input.value = ''
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {newAttribute.options && newAttribute.options.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {newAttribute.options.map((option) => (
                            <Badge key={option} variant="outline" className="flex items-center space-x-1">
                              <span>{option}</span>
                              <button
                                type="button"
                                onClick={() => removeOptionFromNewAttribute(option)}
                                className="hover:bg-red-600 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newAttribute.required}
                      onCheckedChange={(checked) => setNewAttribute({
                        ...newAttribute,
                        required: checked
                      })}
                    />
                    <span className="text-sm">Required attribute</span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addAttribute}
                    disabled={!newAttribute.name || !newAttribute.type}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Attribute
                  </Button>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Status</h3>
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Category</FormLabel>
                      <FormDescription>
                        This category is available for product assignment
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {initialData ? 'Update Category' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}