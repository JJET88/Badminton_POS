import { NextResponse } from "next/server";
import { mysqlPool } from "@/utils/db";

// GET single product
export async function GET(req, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = parseInt(resolvedParams.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    const [rows] = await mysqlPool.query(
      "SELECT * FROM products WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("GET /api/products/[id] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT update product
export async function PUT(req, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = parseInt(resolvedParams.id);
    const body = await req.json();

    console.log("📝 PUT /api/products/[id] called:", { id, body });

    if (isNaN(id)) {
      console.error("❌ Invalid ID:", resolvedParams.id);
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    // Validation
    if (body.title !== undefined && body.title.trim() === "") {
      return NextResponse.json(
        { error: "Product title cannot be empty" },
        { status: 400 }
      );
    }

    if (body.stock !== undefined && body.stock < 0) {
      return NextResponse.json(
        { error: "Stock cannot be negative" },
        { status: 400 }
      );
    }

    if (body.price !== undefined && body.price < 0) {
      return NextResponse.json(
        { error: "Price cannot be negative" },
        { status: 400 }
      );
    }

    // Get current product
    const [currentProduct] = await mysqlPool.query(
      "SELECT * FROM products WHERE id = ?",
      [id]
    );

    if (currentProduct.length === 0) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    console.log("📦 Current product:", currentProduct[0]);

    // Allowed fields for update
    const allowedFields = [
      'title', 'description', 'price', 'stock', 'category', 'image'
    ];

    // Build dynamic SQL
    const fields = [];
    const values = [];

    Object.entries(body).forEach(([key, val]) => {
      if (allowedFields.includes(key) && val !== undefined) {
        // Trim title if it's being updated
        if (key === 'title' && typeof val === 'string') {
          val = val.trim();
        }
        fields.push(`${key} = ?`);
        values.push(val);
        console.log(`  ✓ Updating field: ${key} = ${val}`);
      }
    });

    if (fields.length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Add updatedAt timestamp
    fields.push('updatedAt = CURRENT_TIMESTAMP(3)');
    values.push(id);

    const sql = `UPDATE products SET ${fields.join(", ")} WHERE id = ?`;
    console.log("🔧 Executing SQL:", sql, "Values:", values);

    await mysqlPool.query(sql, values);

    // Fetch updated product
    const [updated] = await mysqlPool.query(
      "SELECT * FROM products WHERE id = ?",
      [id]
    );

    console.log("✅ Updated product:", updated[0]);

    // Log stock changes
    if (body.stock !== undefined && currentProduct[0].stock !== updated[0].stock) {
      console.log(`📦 Stock Update - Product ${id}: ${currentProduct[0].stock} → ${updated[0].stock}`);
    }

    return NextResponse.json(updated[0]);
  } catch (err) {
    console.error("❌ PUT /api/products/[id] error:", err);
    
    if (err.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: "A product with this title already exists" },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE product (permanent deletion with sales check)
export async function DELETE(req, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = parseInt(resolvedParams.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    // Check if product exists
    const [existing] = await mysqlPool.query(
      "SELECT * FROM products WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if product has sales
    const [salesCount] = await mysqlPool.query(
      "SELECT COUNT(*) as count FROM saleitems WHERE productId = ?",
      [id]
    );

    if (salesCount[0].count > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete product with existing sales records (${salesCount[0].count} sales)`,
          code: "HAS_SALES_HISTORY",
          salesCount: salesCount[0].count,
          productName: existing[0].title,
          suggestion: "This product has been sold before and cannot be deleted to maintain sales history"
        },
        { status: 409 }
      );
    }

    // Permanent delete - only if no sales
    try {
      await mysqlPool.query("DELETE FROM products WHERE id = ?", [id]);
      console.log(`🗑️ Product ${id} (${existing[0].title}) permanently deleted`);
      
      return NextResponse.json({ 
        message: "Product deleted successfully",
        productName: existing[0].title
      });
    } catch (err) {
      // If foreign key constraint fails (backup check)
      if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
        return NextResponse.json({ 
          error: "Cannot delete product with existing sales records",
          code: "HAS_SALES_HISTORY",
          suggestion: "This product has been sold before and cannot be deleted to maintain sales history"
        }, { status: 409 });
      }
      throw err;
    }
  } catch (err) {
    console.error("❌ DELETE /api/products/[id] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}