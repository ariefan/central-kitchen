"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Calculator,
  Scale,
  Eye,
  EyeOff,
  ChefHat,
  Package,
  TrendingUp,
  RefreshCw,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Hash,
  FileText,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

// API types
interface Recipe {
  id: string
  code: string
  name: string
  finishedProductId: string
  yieldQtyBase: string
  instructions?: string
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  finishedProduct?: {
    id: string
    name: string
    sku: string
  }
  ingredients?: RecipeIngredient[]
}

interface RecipeIngredient {
  id: string
  recipeId: string
  productId: string
  qtyBase: string
  sortOrder: number
  notes?: string
  product?: {
    id: string
    name: string
    sku: string
  }
  uom?: {
    id: string
    code: string
    name: string
  }
}

interface Product {
  id: string
  name: string
  sku: string
  baseUomId: string
}

interface RecipeCost {
  recipeId: string
  recipeName: string
  baseYieldQty: number
  scaleFactor: number
  totalCost: number
  costPerUnit: number
  ingredientCosts: {
    productId: string
    productName: string
    quantity: number
    unitCost: number
    totalCost: number
  }[]
}

// Form schemas
const recipeFormSchema = z.object({
  code: z.string().min(1, "Recipe code is required").max(50),
  name: z.string().min(1, "Recipe name is required").max(255),
  finishedProductId: z.string().uuid("Please select a finished product"),
  yieldQtyBase: z.number().positive("Yield quantity must be positive"),
  instructions: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    qtyBase: z.number().positive(),
    notes: z.string().optional(),
  })).min(1, "At least one ingredient is required"),
})

const scaleFormSchema = z.object({
  scaleFactor: z.number().positive().optional(),
  targetYieldQty: z.number().positive().optional(),
}).refine(
  (data) => data.scaleFactor !== undefined || data.targetYieldQty !== undefined,
  {
    message: "Either scale factor or target yield quantity must be provided",
    path: ["scaleFactor"],
  }
)

type RecipeFormData = z.infer<typeof recipeFormSchema>
type ScaleFormData = z.infer<typeof scaleFormSchema>

// API functions
async function fetchRecipes(): Promise<Recipe[]> {
  try {
    const response = await fetch('/api/v1/recipes')
    if (!response.ok) {
      throw new Error('Failed to fetch recipes')
    }
    const data = await response.json()
    return data.data
  } catch (error) {
    console.error('Error fetching recipes:', error)
    // Return mock data for development
    return [
      {
        id: "1",
        code: "CHOC-CAKE-001",
        name: "Chocolate Cake",
        finishedProductId: "prod-1",
        yieldQtyBase: "10",
        instructions: "Mix ingredients and bake at 350°F for 30 minutes",
        version: 1,
        isActive: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        finishedProduct: {
          id: "prod-1",
          name: "Chocolate Cake (Whole)",
          sku: "CAKE-CHOC-001",
        },
        ingredients: []
      }
    ]
  }
}

async function fetchProducts(): Promise<Product[]> {
  try {
    const response = await fetch('/api/v1/products')
    if (!response.ok) {
      throw new Error('Failed to fetch products')
    }
    const data = await response.json()
    return data.data
  } catch (error) {
    console.error('Error fetching products:', error)
    // Return mock data for development
    return [
      { id: "prod-1", name: "Chocolate Cake (Whole)", sku: "CAKE-CHOC-001", baseUomId: "uom-1" },
      { id: "prod-2", name: "Chocolate Cake (Slice)", sku: "CAKE-CHOC-SLICE", baseUomId: "uom-2" },
      { id: "ingr-1", name: "Flour", sku: "FLOUR-AP-001", baseUomId: "uom-3" },
      { id: "ingr-2", name: "Sugar", sku: "SUGAR-GRAN-001", baseUomId: "uom-3" },
      { id: "ingr-3", name: "Cocoa Powder", sku: "COCOA-DUTCH-001", baseUomId: "uom-3" },
      { id: "ingr-4", name: "Eggs", sku: "EGGS-LRG-001", baseUomId: "uom-4" },
      { id: "ingr-5", name: "Butter", sku: "BUTTER-UNSALT-001", baseUomId: "uom-3" },
    ]
  }
}

async function fetchRecipeCost(id: string, scaleFactor: number = 1): Promise<RecipeCost> {
  try {
    const response = await fetch(`/api/v1/recipes/${id}/cost?scaleFactor=${scaleFactor}`)
    if (!response.ok) {
      throw new Error('Failed to fetch recipe cost')
    }
    const data = await response.json()
    return data.data
  } catch (error) {
    console.error('Error fetching recipe cost:', error)
    // Return mock data for development
    return {
      recipeId: id,
      recipeName: "Mock Recipe",
      baseYieldQty: 10,
      scaleFactor,
      totalCost: 25.50,
      costPerUnit: 2.55,
      ingredientCosts: []
    }
  }
}

async function createRecipe(data: RecipeFormData): Promise<Recipe> {
  const response = await fetch('/api/v1/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to create recipe')
  }

  const result = await response.json()
  return result.data
}

async function scaleRecipe(id: string, data: ScaleFormData): Promise<any> {
  const response = await fetch(`/api/v1/recipes/${id}/scale`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to scale recipe')
  }

  const result = await response.json()
  return result.data
}

export const Route = createFileRoute('/recipes/')({
  component: RecipesIndex,
})

function RecipesIndex() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showScaleDialog, setShowScaleDialog] = useState(false)
  const [showCostDialog, setShowCostDialog] = useState(false)
  const [selectedIngredient, setSelectedIngredient] = useState<Product | null>(null)

  // Queries
  const { data: recipes = [], isLoading: recipesLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: fetchRecipes,
    refetchInterval: 30000,
  })

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })

  const { data: recipeCost, isLoading: costLoading } = useQuery({
    queryKey: ['recipeCost', selectedRecipe?.id],
    queryFn: () => selectedRecipe ? fetchRecipeCost(selectedRecipe.id) : null,
    enabled: !!selectedRecipe && showCostDialog,
  })

  // Mutations
  const createRecipeMutation = useMutation({
    mutationFn: createRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      setShowCreateDialog(false)
      toast({
        title: "Recipe created",
        description: "Recipe has been created successfully.",
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const scaleRecipeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: ScaleFormData }) => scaleRecipe(id, data),
    onSuccess: () => {
      setShowScaleDialog(false)
      toast({
        title: "Recipe scaled",
        description: "Recipe has been scaled successfully.",
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  // Forms
  const recipeForm = useForm<RecipeFormData>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      code: "",
      name: "",
      finishedProductId: "",
      yieldQtyBase: 1,
      instructions: "",
      items: [{ productId: "", qtyBase: 1 }],
    },
  })

  const scaleForm = useForm<ScaleFormData>({
    resolver: zodResolver(scaleFormSchema),
    defaultValues: {
      scaleFactor: 1,
    },
  })

  // Computed values
  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = !searchQuery ||
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesActive = showInactive || recipe.isActive
    return matchesSearch && matchesActive
  })

  const finishedProducts = products.filter(p =>
    !recipes.some(r => r.finishedProductId === p.id) || selectedRecipe?.finishedProductId === p.id
  )

  const ingredientProducts = products.filter(p =>
    !finishedProducts.includes(p)
  )

  // Handlers
  const handleCreateRecipe = (data: RecipeFormData) => {
    createRecipeMutation.mutate(data)
  }

  const handleScaleRecipe = (data: ScaleFormData) => {
    if (!selectedRecipe) return
    scaleRecipeMutation.mutate({ id: selectedRecipe.id, data })
  }

  const addIngredient = () => {
    const currentItems = recipeForm.getValues('items')
    recipeForm.setValue('items', [...currentItems, { productId: "", qtyBase: 1 }])
  }

  const removeIngredient = (index: number) => {
    const currentItems = recipeForm.getValues('items')
    recipeForm.setValue('items', currentItems.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: 'productId' | 'qtyBase', value: string | number) => {
    const currentItems = recipeForm.getValues('items')
    currentItems[index][field] = value
    recipeForm.setValue('items', currentItems)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recipe Management</h1>
          <p className="text-muted-foreground">
            Manage recipes, ingredients, scaling, and cost calculations
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Recipe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Recipe</DialogTitle>
              <DialogDescription>
                Create a new recipe with ingredients and instructions
              </DialogDescription>
            </DialogHeader>
            <Form {...recipeForm}>
              <form onSubmit={recipeForm.handleSubmit(handleCreateRecipe)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={recipeForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipe Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., CAKE-CHOC-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={recipeForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipe Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Chocolate Cake" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={recipeForm.control}
                    name="finishedProductId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Finished Product</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select finished product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {finishedProducts.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} ({product.sku})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={recipeForm.control}
                    name="yieldQtyBase"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yield Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="1"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={recipeForm.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter cooking instructions..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <FormLabel className="text-base font-medium">Ingredients</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Ingredient
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {recipeForm.watch('items').map((item, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          <Select onValueChange={(value) => updateIngredient(index, 'productId', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select ingredient" />
                            </SelectTrigger>
                            <SelectContent>
                              {ingredientProducts.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} ({product.sku})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-32">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Quantity"
                            value={item.qtyBase}
                            onChange={(e) => updateIngredient(index, 'qtyBase', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="w-24">
                          <Input placeholder="UOM" value="kg" disabled />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeIngredient(index)}
                          disabled={recipeForm.watch('items').length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createRecipeMutation.isPending}>
                    {createRecipeMutation.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Create Recipe
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search recipes by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive">Show Inactive</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recipes</CardTitle>
          <CardDescription>
            Manage your recipe formulations and ingredient lists
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recipesLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Finished Product</TableHead>
                  <TableHead>Yield Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <ChefHat className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">No recipes found</p>
                        <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Create your first recipe
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecipes.map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell className="font-medium">{recipe.code}</TableCell>
                      <TableCell>{recipe.name}</TableCell>
                      <TableCell>{recipe.finishedProduct?.name || 'N/A'}</TableCell>
                      <TableCell>{recipe.yieldQtyBase}</TableCell>
                      <TableCell>
                        <Badge variant={recipe.isActive ? "default" : "secondary"}>
                          {recipe.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRecipe(recipe)
                              setShowCostDialog(true)
                            }}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRecipe(recipe)
                              setShowScaleDialog(true)
                            }}
                          >
                            <Scale className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRecipe(recipe)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedRecipe && !showScaleDialog && !showCostDialog} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              {selectedRecipe?.name}
            </DialogTitle>
            <DialogDescription>
              Recipe details and ingredients
            </DialogDescription>
          </DialogHeader>
          {selectedRecipe && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Recipe Code</Label>
                  <p className="text-sm text-muted-foreground">{selectedRecipe.code}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Version</Label>
                  <p className="text-sm text-muted-foreground">v{selectedRecipe.version}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Yield Quantity</Label>
                  <p className="text-sm text-muted-foreground">{selectedRecipe.yieldQtyBase}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={selectedRecipe.isActive ? "default" : "secondary"}>
                    {selectedRecipe.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              {selectedRecipe.instructions && (
                <div>
                  <Label className="text-sm font-medium">Instructions</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedRecipe.instructions}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Ingredients</Label>
                <div className="mt-2 space-y-2">
                  {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 ? (
                    selectedRecipe.ingredients.map((ingredient) => (
                      <div key={ingredient.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{ingredient.product?.name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{ingredient.product?.sku}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{ingredient.qtyBase} {ingredient.uom?.code || 'unit'}</p>
                          {ingredient.notes && (
                            <p className="text-sm text-muted-foreground">{ingredient.notes}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No ingredients found</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRecipe(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scale Recipe Dialog */}
      <Dialog open={showScaleDialog} onOpenChange={setShowScaleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Scale Recipe
            </DialogTitle>
            <DialogDescription>
              Scale recipe ingredients by factor or target yield
            </DialogDescription>
          </DialogHeader>
          <Form {...scaleForm}>
            <form onSubmit={scaleForm.handleSubmit(handleScaleRecipe)} className="space-y-4">
              <div className="text-center p-4 bg-muted rounded">
                <p className="font-medium">{selectedRecipe?.name}</p>
                <p className="text-sm text-muted-foreground">Current yield: {selectedRecipe?.yieldQtyBase}</p>
              </div>

              <FormField
                control={scaleForm.control}
                name="scaleFactor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scale Factor</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="e.g., 2 for double, 0.5 for half"
                        {...field}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0
                          field.onChange(value)
                          // Clear target yield when scale factor changes
                          scaleForm.setValue('targetYieldQty', undefined)
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Multiply all ingredients by this factor
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={scaleForm.control}
                name="targetYieldQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Yield Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="e.g., 25"
                        {...field}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0
                          field.onChange(value)
                          // Clear scale factor when target yield changes
                          scaleForm.setValue('scaleFactor', undefined)
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Calculate scale factor to achieve this target yield
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowScaleDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={scaleRecipeMutation.isPending}>
                  {scaleRecipeMutation.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Scale className="mr-2 h-4 w-4" />
                  )}
                  Scale Recipe
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Cost Calculation Dialog */}
      <Dialog open={showCostDialog} onOpenChange={setShowCostDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Recipe Cost Analysis
            </DialogTitle>
            <DialogDescription>
              Calculate and analyze recipe costs
            </DialogDescription>
          </DialogHeader>
          {selectedRecipe && (
            <div className="space-y-6">
              <div className="text-center p-4 bg-muted rounded">
                <p className="font-medium">{selectedRecipe.name}</p>
                <p className="text-sm text-muted-foreground">Base yield: {selectedRecipe.yieldQtyBase} units</p>
              </div>

              {costLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : recipeCost ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                        <p className="text-2xl font-bold">${recipeCost.totalCost.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm font-medium text-muted-foreground">Cost Per Unit</p>
                        <p className="text-2xl font-bold">${recipeCost.costPerUnit.toFixed(2)}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-3">Ingredient Costs</h4>
                    <div className="space-y-2">
                      {recipeCost.ingredientCosts.map((cost, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium">{cost.productName}</p>
                            <p className="text-sm text-muted-foreground">
                              {cost.quantity} units @ ${cost.unitCost.toFixed(2)}/unit
                            </p>
                          </div>
                          <p className="font-medium">${cost.totalCost.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Cost calculation not available</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCostDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}