-- CreateTable
CREATE TABLE "Ingreso" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hrRemito" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "origen" TEXT NOT NULL,
    "producto1" TEXT NOT NULL,
    "producto2" TEXT,
    "observacion" TEXT,
    "precinto" TEXT,
    "operador" TEXT,
    "fechaAnalisis" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Despacho" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hrContrato" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "destino" TEXT NOT NULL,
    "producto" TEXT NOT NULL,
    "deposito" TEXT,
    "idTransporte" TEXT NOT NULL,
    "observacion" TEXT,
    "precintSFA" TEXT,
    "precintAduana" TEXT,
    "operador" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Rotulo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipo" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "ingresoId" INTEGER,
    "despachoId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rotulo_ingresoId_fkey" FOREIGN KEY ("ingresoId") REFERENCES "Ingreso" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Rotulo_despachoId_fkey" FOREIGN KEY ("despachoId") REFERENCES "Despacho" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Configuracion_clave_key" ON "Configuracion"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_nombre_key" ON "Producto"("nombre");
