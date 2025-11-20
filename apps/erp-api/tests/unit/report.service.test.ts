import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reportService } from '@/modules/reports/report.service.js';
import { reportRepository } from '@/modules/reports/report.repository.js';

vi.mock('@/modules/reports/report.repository.js', () => {
  const repo = {
    buildSalesWhere: vi.fn(() => []),
    salesByPeriod: vi.fn(),
    salesTotals: vi.fn(),
    salesTopProducts: vi.fn(),
    paymentBreakdown: vi.fn(),
    productMix: vi.fn(),
    inventoryValuation: vi.fn(),
    purchaseOrderStatus: vi.fn(),
  };
  return { reportRepository: repo };
});

const mockRepo = reportRepository as unknown as Record<string, ReturnType<typeof vi.fn>>;
const context = { tenantId: 'tenant-123' } as unknown as import('@/shared/middleware/auth.js').RequestContext;

describe('reportService', () => {
  beforeEach(() => {
    Object.values(mockRepo).forEach((fn) => fn.mockReset());
  });

  it('returns aggregated sales summary', async () => {
    mockRepo.salesByPeriod.mockResolvedValue([
      { period: '2024-01-01', sales: 100, orderCount: 2, customers: 2 },
    ]);
    mockRepo.salesTotals.mockResolvedValue({ totalSales: 100, totalOrders: 2 });
    mockRepo.salesTopProducts.mockResolvedValue([
      { productName: 'Latte', quantity: 2, revenue: 50 },
    ]);
    mockRepo.paymentBreakdown.mockResolvedValue([
      { tender: 'cash', amount: 40, count: 1 },
    ]);

    const result = await reportService.salesSummary({
      dateFrom: new Date().toISOString(),
      dateTo: new Date().toISOString(),
      groupBy: 'day',
    }, context);

    expect(mockRepo.buildSalesWhere).toHaveBeenCalled();
    expect(result.totalSales).toBe('100');
    expect(result.salesByPeriod).toHaveLength(1);
    expect(result.topProducts[0].productName).toBe('Latte');
    expect(result.paymentMethods[0].tender).toBe('cash');
  });

  it('computes product mix totals and average price', async () => {
    mockRepo.productMix.mockResolvedValue([
      { productId: 'p1', productName: 'Latte', taxCategory: 'food', quantity: 4, revenue: 20 },
      { productId: 'p2', productName: 'Tea', taxCategory: null, quantity: 2, revenue: 6 },
    ]);

    const result = await reportService.productMix({
      dateFrom: new Date().toISOString(),
      dateTo: new Date().toISOString(),
      limit: 10,
    }, context);

    expect(result.totalRevenue).toBe('26');
    expect(result.products).toHaveLength(2);
    expect(result.products[0].averagePrice).toBe('5.00');
  });

  it('aggregates inventory valuation per location', async () => {
    mockRepo.inventoryValuation.mockResolvedValue([
      { productId: 'p1', productName: 'Beans', locationId: 'loc1', locationName: 'HQ', quantity: 5, averageCost: 2 },
      { productId: 'p2', productName: 'Milk', locationId: 'loc1', locationName: 'HQ', quantity: 3, averageCost: 1.5 },
    ]);

    const result = await reportService.inventoryValuation({}, context);

    expect(result.totalQuantity).toBe('8');
    expect(result.locations[0].value).toBe('13.5');
    expect(result.items[0].unitCost).toBe('2');
  });

  it('summarizes purchase orders with status breakdown', async () => {
    mockRepo.purchaseOrderStatus.mockResolvedValue({
      statusTotals: [
        { status: 'sent', count: 2, totalValue: 40 },
      ],
      totals: { totalValue: 40, totalOrders: 2 },
      suppliers: [
        { supplierId: 's1', orderCount: 2, totalValue: 40 },
      ],
      trends: [
        { period: '2024-01', orderCount: 2, totalValue: 40 },
      ],
    });

    const result = await reportService.purchaseOrderSummary({
      dateFrom: new Date().toISOString(),
      dateTo: new Date().toISOString(),
    }, context);

    expect(result.totalOrders).toBe(2);
    expect(result.statusByCount.sent).toBe(2);
    expect(result.suppliers[0].supplierName).toContain('Supplier');
    expect(result.trends[0].period).toBe('2024-01');
  });
});
