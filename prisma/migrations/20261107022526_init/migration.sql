-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('TRADITIONAL', 'CHEAP_MARKET', 'STORE', 'SUPERMARKET');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('PIHPS', 'SEED', 'CITIZEN');

-- CreateTable
CREATE TABLE "Commodity" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "iconUrl" TEXT,

    CONSTRAINT "Commodity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MarketType" NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "openHours" TEXT,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Price" (
    "id" SERIAL NOT NULL,
    "price" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "source" "PriceSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commodityId" INTEGER NOT NULL,
    "marketId" INTEGER,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketEvent" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "organizer" TEXT,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "marketId" INTEGER NOT NULL,

    CONSTRAINT "MarketEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Commodity_name_key" ON "Commodity"("name");

-- CreateIndex
CREATE INDEX "Market_latitude_longitude_idx" ON "Market"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Market_type_idx" ON "Market"("type");

-- CreateIndex
CREATE INDEX "Price_commodityId_date_idx" ON "Price"("commodityId", "date");

-- CreateIndex
CREATE INDEX "Price_marketId_commodityId_createdAt_idx" ON "Price"("marketId", "commodityId", "createdAt");

-- CreateIndex
CREATE INDEX "Price_source_idx" ON "Price"("source");

-- CreateIndex
CREATE INDEX "MarketEvent_startAt_idx" ON "MarketEvent"("startAt");

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_commodityId_fkey" FOREIGN KEY ("commodityId") REFERENCES "Commodity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketEvent" ADD CONSTRAINT "MarketEvent_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;
