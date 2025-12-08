import { NextResponse } from "next/server";
import { mysqlPool } from "@/utils/db";

// GET all products
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const lowStock = searchParams.get('lowStock');

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    // Filter by category
    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    // Search by title
    if (search) {
      query += ' AND title LIKE ?';
      params.push(`%${search}%`);
    }

    // Filter low stock items
    if (lowStock) {
      query += ' AND stock <= ?';
      params.push(parseInt(lowStock));
    }

    query += ' ORDER BY createdAt DESC';

    const [rows] = await mysqlPool.query(query, params);
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/products error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST create product
export async function POST(request) {
  try {
    const body = await request.json();
    const { title, description, price, stock, category, image } = body;

    // Validation
    if (!title || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (price === undefined || price < 0) {
      return NextResponse.json(
        { error: 'Valid price is required' },
        { status: 400 }
      );
    }

    if (stock === undefined || stock < 0) {
      return NextResponse.json(
        { error: 'Valid stock quantity is required' },
        { status: 400 }
      );
    }

    const [result] = await mysqlPool.query(
      `INSERT INTO products (title, description, price, stock, category, image)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title.trim(), description || null, price, stock, category || null, image || null]
    );

    const [rows] = await mysqlPool.query(
      `SELECT * FROM products WHERE id = ?`,
      [result.insertId]
    );

    console.log(`✅ Product created: ${rows[0].title} (ID: ${rows[0].id})`);

    return NextResponse.json(rows[0], { status: 201 });
  } catch (e) {
    console.error('POST /api/products error:', e);
    
    // Handle duplicate entry
    if (e.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'A product with this title already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT update product
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, title, description, price, stock, category, image } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Validation
    if (title !== undefined && title.trim() === '') {
      return NextResponse.json(
        { error: 'Title cannot be empty' },
        { status: 400 }
      );
    }

    if (price !== undefined && price < 0) {
      return NextResponse.json(
        { error: 'Price cannot be negative' },
        { status: 400 }
      );
    }

    if (stock !== undefined && stock < 0) {
      return NextResponse.json(
        { error: 'Stock cannot be negative' },
        { status: 400 }
      );
    }

    // Check if product exists
    const [existing] = await mysqlPool.query(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Build dynamic update query
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(price);
    }
    if (stock !== undefined) {
      updates.push('stock = ?');
      params.push(stock);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (image !== undefined) {
      updates.push('image = ?');
      params.push(image);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    params.push(id);

    await mysqlPool.query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [updated] = await mysqlPool.query(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    // Log stock changes
    if (stock !== undefined && existing[0].stock !== updated[0].stock) {
      console.log(`📦 Stock updated: ${updated[0].title} (ID: ${id}): ${existing[0].stock} → ${updated[0].stock}`);
    }

    console.log(`✅ Product updated: ${updated[0].title} (ID: ${id})`);

    return NextResponse.json(updated[0]);
  } catch (e) {
    console.error('PUT /api/products error:', e);
    
    // Handle duplicate entry
    if (e.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: 'A product with this title already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE product (permanent)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Check if product exists
    const [existing] = await mysqlPool.query(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    try {
      // Check if product has sales
      const [salesCount] = await mysqlPool.query(
        'SELECT COUNT(*) as count FROM saleitems WHERE productId = ?',
        [id]
      );

      if (salesCount[0].count > 0) {
        return NextResponse.json({ 
          error: `Cannot delete product with existing sales records (${salesCount[0].count} sales)`,
          code: 'HAS_SALES_HISTORY',
          salesCount: salesCount[0].count,
          suggestion: "This product has been sold before and cannot be deleted to maintain sales history"
        }, { status: 409 });
      }

      // Delete if no sales
      await mysqlPool.query('DELETE FROM products WHERE id = ?', [id]);
      console.log(`🗑️ Product deleted: ${existing[0].title} (ID: ${id})`);
      
      return NextResponse.json({ 
        message: 'Product deleted successfully',
        productName: existing[0].title
      });
    } catch (err) {
      // Foreign key constraint error (backup check)
      if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
        return NextResponse.json({ 
          error: "Cannot delete product with existing sales records",
          code: 'HAS_SALES_HISTORY',
          suggestion: "This product has been sold before and cannot be deleted to maintain sales history"
        }, { status: 409 });
      }
      throw err;
    }
  } catch (e) {
    console.error('DELETE /api/products error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}