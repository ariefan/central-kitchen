import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun, ChefHat, Package, TrendingUp, Shield, Zap, Users, Layers, Bot, ChevronRight, Mail, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'

function App() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true'
    setDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', String(newDarkMode))
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-orange-100 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <ChefHat className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              Central Kitchen ERP
            </span>
          </motion.div>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-orange-500 transition">Features</a>
            <a href="#products" className="text-gray-600 dark:text-gray-300 hover:text-orange-500 transition">Products</a>
            <a href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-orange-500 transition">Pricing</a>
            <a href="#contact" className="text-gray-600 dark:text-gray-300 hover:text-orange-500 transition">Contact</a>
          </nav>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="rounded-full"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <Badge className="mb-4 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              F&B Management Made Simple
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 bg-clip-text text-transparent">
              Run Your Kitchen
              <br />
              Like a Pro
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Complete ERP solution for central kitchens, cloud kitchens, and F&B businesses. Manage inventory, recipes, production, and orders in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700">
                Start Free Trial
                <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400">
                Watch Demo
              </Button>
            </div>

            {/* Mock Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-16 relative"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border border-orange-100 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Today's Revenue</CardDescription>
                      <CardTitle className="text-2xl">Rp 12,500,000</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-green-600 dark:text-green-400">+12.5% from yesterday</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Active Orders</CardDescription>
                      <CardTitle className="text-2xl">48</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-orange-600 dark:text-orange-400">6 pending production</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Stock Alert</CardDescription>
                      <CardTitle className="text-2xl">3 Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-red-600 dark:text-red-400">Need reordering</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-orange-200 dark:bg-orange-900 rounded-full blur-3xl opacity-50"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-orange-300 dark:bg-orange-800 rounded-full blur-3xl opacity-50"></div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              Core Features
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Everything You Need to Scale
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Built specifically for F&B operations with modular features that grow with your business
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Layers className="w-6 h-6" />,
                title: "Modular by Design",
                description: "Start with what you need. Add modules as you grow. No bloat, just efficiency."
              },
              {
                icon: <Bot className="w-6 h-6" />,
                title: "AI-Powered Insights",
                description: "Smart forecasting, automated reordering, and intelligent recipe costing."
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Enterprise Security",
                description: "Bank-level encryption, role-based access, and complete audit trails."
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Lightning Fast",
                description: "Optimized for speed. Process orders in milliseconds, not seconds."
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: "Multi-Location",
                description: "Manage multiple kitchens, warehouses, and outlets from one dashboard."
              },
              {
                icon: <TrendingUp className="w-6 h-6" />,
                title: "Real-Time Analytics",
                description: "Live dashboards, profit tracking, and performance metrics at your fingertips."
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow border-orange-100 dark:border-gray-700">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              Product Modules
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Built for F&B Operations
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <ChefHat className="w-8 h-8" />,
                title: "Kitchen & Recipes",
                description: "Recipe management, batch production, yield tracking, and cost calculation. Perfect for central kitchens.",
                features: ["Recipe versioning", "Batch scaling", "Cost analysis", "Prep scheduling"]
              },
              {
                icon: <Package className="w-8 h-8" />,
                title: "Inventory Control",
                description: "Real-time stock tracking, automated reordering, expiry management, and multi-warehouse support.",
                features: ["FIFO/FEFO tracking", "Auto-reorder", "Waste tracking", "Supplier management"]
              },
              {
                icon: <TrendingUp className="w-8 h-8" />,
                title: "POS & Orders",
                description: "Integrated point-of-sale, order management, delivery tracking, and customer loyalty programs.",
                features: ["Multi-channel orders", "Table management", "Payment integration", "Loyalty rewards"]
              }
            ].map((product, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full border-orange-200 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-600 transition-colors">
                  <CardHeader>
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white mb-4">
                      {product.icon}
                    </div>
                    <CardTitle className="text-xl">{product.title}</CardTitle>
                    <CardDescription>{product.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {product.features.map((feature, i) => (
                        <li key={i} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <ChevronRight className="w-4 h-4 text-orange-500 mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              Pricing
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Simple, Transparent Pricing
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Pay for what you use. Scale as you grow. No hidden fees.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Starter",
                price: "2,500,000",
                period: "per month",
                description: "Perfect for single location operations",
                features: [
                  "1 Location",
                  "Up to 5 users",
                  "Basic inventory",
                  "Recipe management",
                  "Email support"
                ]
              },
              {
                name: "Growth",
                price: "7,500,000",
                period: "per month",
                popular: true,
                description: "For growing multi-location businesses",
                features: [
                  "Up to 5 locations",
                  "Unlimited users",
                  "Advanced inventory",
                  "Production planning",
                  "Priority support",
                  "API access"
                ]
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "per month",
                description: "For large-scale operations",
                features: [
                  "Unlimited locations",
                  "Unlimited users",
                  "Custom modules",
                  "Dedicated support",
                  "On-premise option",
                  "SLA guarantee"
                ]
              }
            ].map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`h-full ${plan.popular ? 'border-orange-500 dark:border-orange-600 shadow-lg scale-105' : 'border-orange-100 dark:border-gray-700'}`}>
                  <CardHeader>
                    {plan.popular && (
                      <Badge className="mb-2 w-fit bg-orange-500 text-white">Most Popular</Badge>
                    )}
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        Rp {plan.price}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 ml-2">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <ChevronRight className="w-4 h-4 text-orange-500 mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${
                        plan.popular
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700'
                          : 'bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900 dark:text-orange-300'
                      }`}
                    >
                      Get Started
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              FAQ
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <Accordion type="single" collapsible className="w-full">
            {[
              {
                question: "How long does implementation take?",
                answer: "Most businesses are up and running within 1-2 weeks. Our team handles data migration, training, and setup to ensure a smooth transition."
              },
              {
                question: "Can I integrate with my existing POS system?",
                answer: "Yes! We offer integrations with popular POS systems, or you can use our built-in POS module. Our API allows custom integrations."
              },
              {
                question: "Is my data secure?",
                answer: "Absolutely. We use bank-level encryption, regular backups, and comply with international data protection standards. Your data is yours."
              },
              {
                question: "Do you offer training?",
                answer: "Yes! We provide comprehensive onboarding training, video tutorials, and ongoing support to ensure your team is confident using the system."
              },
              {
                question: "What if I need custom features?",
                answer: "Our Enterprise plan includes custom module development. We work with you to build exactly what your business needs."
              }
            ].map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-gray-600 dark:text-gray-300">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-20 px-4 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4 text-white">
              Ready to Transform Your Kitchen?
            </h2>
            <p className="text-xl text-orange-100 mb-8">
              Join hundreds of F&B businesses already using Central Kitchen ERP
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                className="bg-white dark:bg-gray-800"
              />
              <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50">
                Start Free Trial
              </Button>
            </div>

            <p className="mt-4 text-sm text-orange-100">
              No credit card required. 14-day free trial.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-orange-100 dark:border-gray-800 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ChefHat className="w-6 h-6 text-orange-500" />
                <span className="font-bold text-gray-900 dark:text-white">Central Kitchen ERP</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Complete ERP solution for F&B businesses
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-gray-900 dark:text-white">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li><a href="#features" className="hover:text-orange-500">Features</a></li>
                <li><a href="#pricing" className="hover:text-orange-500">Pricing</a></li>
                <li><a href="#" className="hover:text-orange-500">Integrations</a></li>
                <li><a href="#" className="hover:text-orange-500">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-gray-900 dark:text-white">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li><a href="#" className="hover:text-orange-500">About</a></li>
                <li><a href="#" className="hover:text-orange-500">Blog</a></li>
                <li><a href="#" className="hover:text-orange-500">Careers</a></li>
                <li><a href="#contact" className="hover:text-orange-500">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-gray-900 dark:text-white">Contact</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  info@personalapp.id
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  +62 812-3456-7890
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Jakarta, Indonesia
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-orange-100 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              © 2025 Central Kitchen ERP. All rights reserved.
            </p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="text-sm text-gray-600 dark:text-gray-300 hover:text-orange-500">Privacy Policy</a>
              <a href="#" className="text-sm text-gray-600 dark:text-gray-300 hover:text-orange-500">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
