    <style>
        * { box-sizing: border-box; }
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { color: #333; margin-top: 0; }
        h2 { color: #555; border-bottom: 1px solid #eee; padding-bottom: 8px; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .btn {
            display: inline-block;
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            text-decoration: none;
            transition: background-color 0.15s;
        }
        .btn-primary { background-color: #007bff; color: white; }
        .btn-primary:hover { background-color: #0056b3; color: white; text-decoration: none; }
        .btn-danger { background-color: #dc3545; color: white; }
        .btn-danger:hover { background-color: #c82333; color: white; text-decoration: none; }
        .btn-secondary { background-color: #6c757d; color: white; }
        .btn-secondary:hover { background-color: #545b62; color: white; text-decoration: none; }
        .btn-sm { padding: 4px 10px; font-size: 12px; }
        .message {
            padding: 12px 16px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        .message.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .message.error   { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .message.warning { background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
        .message.info    { background-color: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 14px;
        }
        th, td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }
        tr:hover td { background-color: #f8f9fa; }
        .filter-form {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: flex-end;
            margin-bottom: 20px;
            padding: 16px;
            background: #f8f9fa;
            border-radius: 6px;
            border: 1px solid #dee2e6;
        }
        .filter-form .form-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 160px;
        }
        .filter-form label { font-size: 13px; font-weight: 600; color: #495057; }
        .filter-form input,
        .filter-form select {
            padding: 7px 10px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 14px;
        }
        .pagination {
            display: flex;
            gap: 6px;
            margin-top: 16px;
            align-items: center;
            flex-wrap: wrap;
        }
        .pagination a, .pagination span {
            display: inline-block;
            padding: 6px 12px;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            font-size: 14px;
            color: #007bff;
            text-decoration: none;
        }
        .pagination span { color: #6c757d; }
        .pagination a:hover { background-color: #e9ecef; }
        .pagination .active { background-color: #007bff; color: white; border-color: #007bff; }
        .truncate { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-blue { background: #cce5ff; color: #004085; }
        .badge-green { background: #d4edda; color: #155724; }
        .badge-gray { background: #e2e3e5; color: #383d41; }
    </style>
