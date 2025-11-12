import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun, ChefHat, Package, TrendingUp, Shield, Zap, Users, Sparkles, ShoppingCart, BarChart3, ShieldCheck, ChevronRight, Mail, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'

// Gradient decoration component
function GradientDecor() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute left-[10%] top-[-10%] h-72 w-72 rounded-full bg-orange-200/50 blur-3xl dark:bg-orange-900/30" />
      <div className="absolute right-[15%] top-[20%] h-96 w-96 rounded-full bg-orange-300/40 blur-3xl dark:bg-orange-800/20" />
      <div className="absolute left-[20%] bottom-[10%] h-80 w-80 rounded-full bg-orange-100/60 blur-3xl dark:bg-orange-950/40" />
    </div>
  )
}

// Enhanced mode toggle component
function ModeToggle({ small = false }: { small?: boolean }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('darkMode')
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = stored === 'true' || (stored === null && systemDark)

    setIsDark(shouldBeDark)
    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggle = () => {
    const newDark = !isDark
    setIsDark(newDark)
    localStorage.setItem('darkMode', String(newDark))
    document.documentElement.classList.toggle('dark', newDark)
  }

  return (
    <Button
      variant="ghost"
      size={small ? "sm" : "icon"}
      onClick={toggle}
      className="rounded-full"
    >
      {isDark ? <Sun className={small ? "w-4 h-4" : "w-5 h-5"} /> : <Moon className={small ? "w-4 h-4" : "w-5 h-5"} />}
    </Button>
  )
}

// Statistics chip component
function StatChip({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-lg font-bold text-gray-900 dark:text-white">{value}</span>
      {trend && <span className="text-xs text-green-600 dark:text-green-400">{trend}</span>}
    </div>
  )
}

// Progress row component
function ProgressRow({ name, value, max, color = "orange" }: { name: string; value: number; max: number; color?: string }) {
  const percentage = (value / max) * 100

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 dark:text-gray-300 flex-1 truncate">{name}</span>
      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full bg-${color}-500 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-200 w-8 text-right">{value}</span>
    </div>
  )
}

// Inventory row component
function InventoryRow({ name, status }: { name: string; status: 'good' | 'warning' | 'critical' }) {
  const colors = {
    good: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500'
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span className="text-xs text-gray-600 dark:text-gray-300">{name}</span>
    </div>
  )
}

// LogoPill component
function LogoPill({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {text}
    </div>
  )
}

// Product mock with charts
function ProductMock() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border border-orange-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-3 h-3 rounded-full bg-red-400"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
        <div className="w-3 h-3 rounded-full bg-green-400"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pesanan Hari Ini</CardDescription>
            <CardTitle className="text-2xl">127</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-600 dark:text-green-400">+18% dari kemarin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendapatan</CardDescription>
            <CardTitle className="text-2xl">Rp 18.5JT</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-600 dark:text-green-400">+12.3% dari kemarin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. Ticket</CardDescription>
            <CardTitle className="text-2xl">Rp 145K</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-600 dark:text-orange-400">-2.1% dari kemarin</p>
          </CardContent>
        </Card>
      </div>

      {/* Mini chart area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Menu Terlaris</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ProgressRow name="Nasi Goreng Spesial" value={45} max={50} />
            <ProgressRow name="Ayam Geprek" value={38} max={50} />
            <ProgressRow name="Es Teh Manis" value={62} max={70} />
            <ProgressRow name="Mie Goreng" value={28} max={50} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Status Inventori</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <InventoryRow name="Beras (50kg)" status="good" />
            <InventoryRow name="Ayam Fillet (25kg)" status="good" />
            <InventoryRow name="Minyak Goreng (20L)" status="warning" />
            <InventoryRow name="Cabai Rawit (5kg)" status="critical" />
            <InventoryRow name="Bawang Merah (10kg)" status="good" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <GradientDecor />

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-orange-100 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <Sparkles className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              personalapp.id
            </span>
          </motion.div>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-orange-500 transition">Fitur</a>
            <a href="#products" className="text-gray-600 dark:text-gray-300 hover:text-orange-500 transition">Produk</a>
            <a href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-orange-500 transition">Harga</a>
            <a href="#contact" className="text-gray-600 dark:text-gray-300 hover:text-orange-500 transition">Kontak</a>
          </nav>

          <div className="flex items-center gap-4">
            <ModeToggle />
            <Button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700">
              Mulai Sekarang
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <div>
            <Badge className="bg-orange-200/80 text-zinc-900 dark:bg-orange-900/40 dark:text-orange-100">
              Aplikasi khusus untuk tim yang tidak percaya solusi serba‑sama
            </Badge>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl"
            >
              Aplikasi personal yang mengikuti alur kerja Anda—
              <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-pink-500 bg-clip-text text-transparent dark:from-orange-400 dark:via-amber-300 dark:to-pink-300">
                bukan sebaliknya
              </span>
            </motion.h1>
            <p className="mt-4 max-w-xl text-base text-zinc-700 dark:text-zinc-200">
              Kami merancang produk adaptif dengan asistensi AI yang terasa kustom sejak hari pertama. Hari ini kami fokus pada <span className="font-semibold"> ERP untuk F&B</span>—besok, apa pun yang dibutuhkan operasional Anda. B2B, B2C, atau B2G—selama bersifat personal, itu wilayah kami.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button size="lg" className="bg-orange-500 text-white hover:bg-orange-600">
                <Sparkles className="mr-2 h-4 w-4" /> Lihat demo langsung
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white text-zinc-900 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700"
                asChild
              >
                <a href="#product">Jelajahi paket F&B</a>
              </Button>
              <div className="text-xs text-zinc-600 dark:text-zinc-300">Onboarding cepat · Dukungan manusia · Tanpa kuncian vendor</div>
            </div>
            <div className="mt-8 flex items-center gap-6 opacity-90">
              <LogoPill text="Kafe" />
              <LogoPill text="Restoran" />
              <LogoPill text="Dapur Cloud" />
              <LogoPill text="Kantin Instansi" />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <ProductMock />
          </motion.div>
        </div>
      </section>

      {/* Product Tiles Section */}
      <section id="products" className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              Modul Produk
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Dibangun untuk Operasional F&B
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Solusi modular yang berkembang sesuai kebutuhan bisnis Anda
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <ChefHat className="w-8 h-8" />,
                title: "Dapur & Resep",
                description: "Manajemen resep, produksi batch, tracking yield, dan kalkulasi biaya. Sempurna untuk dapur pusat.",
                features: ["Versioning resep", "Scaling batch otomatis", "Analisis biaya COGS", "Penjadwalan prep"]
              },
              {
                icon: <Package className="w-8 h-8" />,
                title: "Persediaan & COGS",
                description: "Tracking stok real-time, auto-reorder, manajemen kedaluwarsa, dan dukungan multi-gudang.",
                features: ["Tracking FIFO/FEFO", "Auto-reorder cerdas", "Tracking waste", "Manajemen supplier"]
              },
              {
                icon: <ShoppingCart className="w-8 h-8" />,
                title: "POS & Pesanan",
                description: "Point-of-sale terintegrasi, manajemen pesanan, tracking delivery, dan program loyalitas pelanggan.",
                features: ["Order multi-channel", "Manajemen meja", "Integrasi payment", "Reward loyalitas"]
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

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              Fitur Utama
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Semua yang Anda Butuhkan untuk Berkembang
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Dibangun khusus untuk operasional F&B dengan fitur modular yang berkembang bersama bisnis Anda
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "Desain Modular",
                description: "Mulai dengan yang Anda butuhkan. Tambahkan modul seiring pertumbuhan. Tanpa fitur berlebihan, hanya efisiensi."
              },
              {
                icon: <Sparkles className="w-6 h-6" />,
                title: "Insight Bertenaga AI",
                description: "Forecasting cerdas, auto-reorder otomatis, dan kalkulasi biaya resep yang intelligent."
              },
              {
                icon: <ShieldCheck className="w-6 h-6" />,
                title: "Keamanan Enterprise",
                description: "Enkripsi tingkat bank, akses berbasis role, dan jejak audit lengkap."
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Sangat Cepat",
                description: "Dioptimalkan untuk kecepatan. Proses pesanan dalam milidetik, bukan detik."
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: "Multi-Lokasi",
                description: "Kelola multiple dapur, gudang, dan outlet dari satu dashboard."
              },
              {
                icon: <TrendingUp className="w-6 h-6" />,
                title: "Analitik Real-Time",
                description: "Dashboard live, tracking profit, dan metrik performa di ujung jari Anda."
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

      {/* Use Cases Section */}
      <section className="py-20 px-4 bg-white dark:bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              Use Cases
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Untuk Siapa personalapp.id?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "Dapur Pusat & Catering",
                description: "Kelola produksi batch besar, tracking COGS per resep, dan distribusi ke multiple outlet dengan mudah.",
                image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop"
              },
              {
                title: "Cloud Kitchen & Virtual Brand",
                description: "Operasikan multiple brand dari satu dapur. Manajemen menu, inventori, dan pesanan online terintegrasi.",
                image: "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&auto=format&fit=crop"
              },
              {
                title: "Restoran & Kafe",
                description: "Dari POS hingga inventori, dari reservasi hingga program loyalitas—semua dalam satu platform.",
                image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop"
              },
              {
                title: "Food Retail & FMCG",
                description: "Manajemen produksi, distribusi, dan penjualan produk makanan packaged dengan tracking batch dan kedaluwarsa.",
                image: "https://images.unsplash.com/photo-1601599561213-832382fd07ba?w=800&auto=format&fit=crop"
              }
            ].map((usecase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full overflow-hidden border-orange-200 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-600 transition-colors">
                  <div className="h-48 overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={usecase.image}
                      alt={usecase.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle>{usecase.title}</CardTitle>
                    <CardDescription>{usecase.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge className="mb-4 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              Harga
            </Badge>
            <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Harga Sederhana & Transparan
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Bayar sesuai kebutuhan. Scale seiring pertumbuhan. Tanpa biaya tersembunyi.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Pemula",
                price: "2,500,000",
                period: "per bulan",
                description: "Sempurna untuk operasional single-location",
                features: [
                  "1 Lokasi",
                  "Hingga 5 pengguna",
                  "Inventori dasar",
                  "Manajemen resep",
                  "Email support"
                ]
              },
              {
                name: "Pertumbuhan",
                price: "7,500,000",
                period: "per bulan",
                popular: true,
                description: "Untuk bisnis multi-lokasi yang berkembang",
                features: [
                  "Hingga 5 lokasi",
                  "Unlimited pengguna",
                  "Inventori advanced",
                  "Production planning",
                  "Priority support",
                  "Akses API"
                ]
              },
              {
                name: "Enterprise",
                price: "Hubungi Kami",
                period: "per bulan",
                description: "Untuk operasional skala besar",
                features: [
                  "Unlimited lokasi",
                  "Unlimited pengguna",
                  "Modul custom",
                  "Dedicated support",
                  "Opsi on-premise",
                  "Garansi SLA"
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
                      <Badge className="mb-2 w-fit bg-orange-500 text-white">Paling Populer</Badge>
                    )}
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        {plan.price.includes('Hubungi') ? plan.price : `Rp ${plan.price}`}
                      </span>
                      {!plan.price.includes('Hubungi') && (
                        <span className="text-gray-600 dark:text-gray-400 ml-2">{plan.period}</span>
                      )}
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
                      Mulai Sekarang
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-white dark:bg-gray-900">
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
              Pertanyaan yang Sering Diajukan
            </h2>
          </motion.div>

          <Accordion type="single" collapsible className="w-full">
            {[
              {
                question: "Berapa lama waktu implementasi?",
                answer: "Sebagian besar bisnis sudah berjalan dalam 1-2 minggu. Tim kami menangani migrasi data, training, dan setup untuk memastikan transisi yang mulus."
              },
              {
                question: "Apakah bisa integrasi dengan sistem POS yang sudah ada?",
                answer: "Ya! Kami menawarkan integrasi dengan sistem POS populer, atau Anda bisa menggunakan modul POS built-in kami. API kami memungkinkan integrasi custom."
              },
              {
                question: "Apakah data saya aman?",
                answer: "Tentu saja. Kami menggunakan enkripsi tingkat bank, backup reguler, dan mematuhi standar perlindungan data internasional. Data Anda adalah milik Anda."
              },
              {
                question: "Apakah ada training?",
                answer: "Ya! Kami menyediakan training onboarding komprehensif, tutorial video, dan dukungan berkelanjutan untuk memastikan tim Anda percaya diri menggunakan sistem."
              },
              {
                question: "Bagaimana jika saya butuh fitur khusus?",
                answer: "Paket Enterprise kami mencakup pengembangan modul custom. Kami bekerja sama dengan Anda untuk membangun persis apa yang bisnis Anda butuhkan."
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
              Siap Mengubah Operasional Dapur Anda?
            </h2>
            <p className="text-xl text-orange-100 mb-8">
              Bergabunglah dengan ratusan bisnis F&B yang sudah menggunakan personalapp.id
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Masukkan email Anda"
                className="bg-white dark:bg-gray-800"
              />
              <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50">
                Coba Gratis
              </Button>
            </div>

            <p className="mt-4 text-sm text-orange-100">
              Tanpa kartu kredit. Gratis 14 hari.
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
                <Sparkles className="w-6 h-6 text-orange-500" />
                <span className="font-bold text-gray-900 dark:text-white">personalapp.id</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Aplikasi personal untuk operasional F&B Anda
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-gray-900 dark:text-white">Produk</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li><a href="#features" className="hover:text-orange-500">Fitur</a></li>
                <li><a href="#pricing" className="hover:text-orange-500">Harga</a></li>
                <li><a href="#" className="hover:text-orange-500">Integrasi</a></li>
                <li><a href="#" className="hover:text-orange-500">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-gray-900 dark:text-white">Perusahaan</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li><a href="#" className="hover:text-orange-500">Tentang</a></li>
                <li><a href="#" className="hover:text-orange-500">Blog</a></li>
                <li><a href="#" className="hover:text-orange-500">Karir</a></li>
                <li><a href="#contact" className="hover:text-orange-500">Kontak</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-gray-900 dark:text-white">Kontak</h4>
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
              © 2025 personalapp.id. Dibangun dengan cinta untuk operator—disukai kucing oranye.
            </p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="text-sm text-gray-600 dark:text-gray-300 hover:text-orange-500">Kebijakan Privasi</a>
              <a href="#" className="text-sm text-gray-600 dark:text-gray-300 hover:text-orange-500">Syarat Layanan</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
