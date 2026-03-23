#!/usr/bin/env python3
"""
Improved Data Loader for Pharmaceutical Supply Chain POC
Optimized for faster seeding and controlled dataset size
"""

import os
import pandas as pd
import pandas as pd
import numpy as np
from pymongo import MongoClient
from datetime import datetime, timedelta
import logging

# ---------------- CONFIG ----------------
MAX_DRUGS = 50          # limit number of drugs loaded
HISTORY_DAYS = 30       # number of historical days per drug
BATCH_SIZE = 1000       # mongo batch insert size

# ----------------------------------------

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(levelname)s - %(message)s")

logger = logging.getLogger(__name__)


class DataLoader:

    def __init__(self, mongo_uri="mongodb://localhost:27017/",
                 db_name="pharma_supply_chain"):

        self.client = MongoClient(mongo_uri)
        self.db = self.client[db_name]

        self.client.admin.command("ping")
        logger.info("Connected to MongoDB")

    # -----------------------------------------------------
    # CLEAR DATABASE
    # -----------------------------------------------------

    def clear_collections(self):
        logger.warning("Dropping existing collections...")

        self.db.drugs.drop()
        self.db.inventory.drop()
        self.db.sales_history.drop()

        logger.info("Collections cleared")

    # -----------------------------------------------------
    # LOAD MEDICINES
    # -----------------------------------------------------

    def load_medicines(self, path="data/medicines.csv"):

        if not os.path.exists(path):
            logger.error("Medicines CSV not found")
            return

        df = pd.read_csv(path)
        df = df.dropna(subset=["med_name"]).head(MAX_DRUGS)

        medicines = []

        for _, row in df.iterrows():

            price_str = str(row.get("final_price", "0"))\
                .replace("₹", "").replace(",", "")

            try:
                price = float(price_str)
            except:
                price = 0.0

            medicines.append({
                "id": row["med_name"].lower().replace(" ", "_"),
                "name": row["med_name"],
                "generic_name": row.get("generic_name", ""),
                "manufacturer": row.get("drug_manufacturer", ""),
                "price": price,
                "disease_category": row.get("disease_name", ""),
                "created_at": datetime.utcnow()
            })

        if medicines:
            self.db.drugs.insert_many(medicines)

        logger.info(f"{len(medicines)} medicines inserted")

    # -----------------------------------------------------
    # LOAD SUPPLY CHAIN DATA
    # -----------------------------------------------------

    def load_supply_chain(self,
                          path="data/Pharmaceutical Supply Chain Optimization.xlsx"):

        if not os.path.exists(path):
            logger.error("Supply chain file missing")
            return

        df = pd.read_excel(path).head(MAX_DRUGS)

        inventory_batch = []
        sales_batch = []

        base_date = datetime.utcnow() - timedelta(days=HISTORY_DAYS)

        for _, row in df.iterrows():

            drug = row["Drug"]
            drug_id = drug.lower().replace(" ", "_")

            demand = int(row.get("Demand_Forecast", 50))
            optimal = int(row.get("Optimal_Stock_Level", 100))

            # ---------------- inventory ----------------

            inventory_batch.append({
                "drug_id": drug_id,
                "drug_name": drug,
                "branch_id": "MAIN_BRANCH",
                "current_stock": int(optimal * 0.8),
                "optimal_stock": optimal,
                "safe_stock": int(optimal * 0.2),
                "demand_forecast": demand,
                "updated_at": datetime.utcnow()
            })

            # ---------------- sales history ----------------

            for day in range(HISTORY_DAYS):

                date = base_date + timedelta(days=day)

                daily = max(
                    1,
                    int(demand / 30 + np.random.normal(0, 5))
                )

                price = 10 + (day % 3)

                sales_batch.append({
                    "drug_id": drug_id,
                    "drug_name": drug,
                    "branch_id": "MAIN_BRANCH",
                    "quantity": daily,
                    "date": date,
                    "unit_price": price,
                    "total_amount": price * daily
                })

                if len(sales_batch) >= BATCH_SIZE:
                    self.db.sales_history.insert_many(sales_batch)
                    sales_batch.clear()

        # insert remaining
        if inventory_batch:
            self.db.inventory.insert_many(inventory_batch)

        if sales_batch:
            self.db.sales_history.insert_many(sales_batch)

        logger.info("Supply chain data inserted")

    # -----------------------------------------------------
    # INDEXES
    # -----------------------------------------------------

    def create_indexes(self):

        logger.info("Creating indexes")

        self.db.sales_history.create_index(
            [("drug_id", 1), ("date", -1)]
        )

        self.db.inventory.create_index(
            [("drug_id", 1), ("branch_id", 1)]
        )

        self.db.drugs.create_index("id")

    # -----------------------------------------------------

    def stats(self):

        stats = {
            "drugs": self.db.drugs.count_documents({}),
            "inventory": self.db.inventory.count_documents({}),
            "sales_history": self.db.sales_history.count_documents({})
        }

        logger.info(stats)


# ---------------------------------------------------------

def main():

    loader = DataLoader()

    loader.clear_collections()

    loader.load_medicines()

    loader.load_supply_chain()

    loader.create_indexes()

    loader.stats()

    logger.info("Database seeded successfully")


if __name__ == "__main__":
    main()