import { describe, expect, it } from "vitest";
import { seedStores } from "@/lib/data/seed";
import { formatDistance, haversineKm, sortByDistance } from "@/lib/geo/haversine";

describe("haversineKm", () => {
  it("é zero para o mesmo ponto", () => {
    expect(haversineKm({ lat: -30, lng: -51 }, { lat: -30, lng: -51 })).toBe(0);
  });

  it("bate com distâncias conhecidas", () => {
    // Porto Alegre (Praça da Matriz) → Caxias do Sul (centro): ~95 km em linha reta
    const poa = { lat: -30.0331, lng: -51.2302 };
    const caxias = { lat: -29.1678, lng: -51.1794 };
    expect(haversineKm(poa, caxias)).toBeGreaterThan(94);
    expect(haversineKm(poa, caxias)).toBeLessThan(98);
    // 1 grau de latitude ≈ 111,2 km
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.2, 0);
  });

  it("é simétrica", () => {
    const a = { lat: -29.69, lng: -51.14 };
    const b = { lat: -30.11, lng: -51.33 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });
});

describe("sortByDistance com as lojas do seed", () => {
  it("CEP 93010-001 (centro de São Leopoldo) → loja de São Leopoldo", () => {
    // coordenadas que a BrasilAPI devolve para esse CEP
    const [first] = sortByDistance({ lat: -29.76028, lng: -51.14722 }, seedStores);
    expect(first.slug).toBe("sao-leopoldo");
    expect(first.distanceKm).toBeLessThan(3);
  });

  it("Novo Hamburgo → São Leopoldo, a uns 9 km", () => {
    const ranked = sortByDistance({ lat: -29.6905705, lng: -51.1429035 }, seedStores);
    expect(ranked[0].slug).toBe("sao-leopoldo");
    expect(ranked[0].distanceKm).toBeGreaterThan(7);
    expect(ranked[0].distanceKm).toBeLessThan(11);
    // a segunda opção fica longe (> 15 km), então não deve ser oferecida
    expect(ranked[1].distanceKm).toBeGreaterThan(15);
  });
});

describe("formatDistance", () => {
  it("formata em pt-BR", () => {
    expect(formatDistance(0.33)).toBe("350 m");
    expect(formatDistance(1.44)).toBe("1,4 km");
    expect(formatDistance(9.2)).toBe("9,2 km");
    expect(formatDistance(31.6)).toBe("32 km");
  });
});
