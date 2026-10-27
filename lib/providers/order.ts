// Acesso a pedidos. Hoje: mock na tabela mock_orders. Depois: VTEX OMS
// (GET /api/oms/pvt/orders/{orderId}) implementando a mesma interface.
import type { DataStore } from "../data/store";
import type { MockOrderRow, OrderStatus } from "../data/types";

export interface Order {
  number: string;
  customerFirstName: string;
  status: OrderStatus;
  deliveryType: "entrega" | "retirada";
  storeSlug: string | null;
  items: { name: string; qty: number; price: number }[];
  total: number;
  timeline: { status: OrderStatus; at: string }[];
  eta: string | null;
  /** CPF só para conferência interna; nunca vai para o modelo. */
  cpf: string;
}

export interface OrderProvider {
  findByNumber(orderNumber: string): Promise<Order | null>;
  findByCpf(cpf: string): Promise<Order[]>;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pagamento_aprovado: "Pagamento aprovado",
  separando: "Separando no estoque",
  saiu_para_entrega: "Saiu para entrega",
  entregue: "Entregue",
  retirada_disponivel: "Retirada na loja disponível",
  atrasado: "Atrasado",
};

function fromRow(r: MockOrderRow): Order {
  return {
    number: r.order_number,
    customerFirstName: r.customer_name.split(" ")[0],
    status: r.status,
    deliveryType: r.delivery_type,
    storeSlug: r.store_slug,
    items: r.items,
    total: Number(r.total),
    timeline: r.timeline,
    eta: r.eta,
    cpf: r.cpf,
  };
}

export class MockOrderProvider implements OrderProvider {
  constructor(private store: DataStore) {}

  async findByNumber(orderNumber: string) {
    const row = await this.store.orderByNumber(orderNumber.replace(/\D/g, ""));
    return row ? fromRow(row) : null;
  }

  async findByCpf(cpf: string) {
    return (await this.store.ordersByCpf(cpf.replace(/\D/g, ""))).map(fromRow);
  }
}
