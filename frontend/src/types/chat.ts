/**
 * Kiểu dữ liệu cho luồng chat + trích dẫn.
 * Tách riêng khỏi component để làm "một nguồn sự thật" (single source of truth).
 */

export interface Citation {
  /** Số thứ tự hiển thị trong câu trả lời, ví dụ [1], [2]. */
  index: number;
  /** Tên file nguồn, ví dụ "Deep Learning Textbook". */
  sourceFile: string;
  /** Số trang trong nguồn. */
  page: number;
  /** Đoạn trích ngắn hiển thị ở danh sách nguồn. */
  snippet: string;
  /** Câu/đoạn được highlight trong panel xem nguồn. */
  highlightedQuote: string;
}

export interface ChatMessage {
  /** Định danh duy nhất của tin nhắn (dùng làm React key, tránh trùng khi mock/thêm). */
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Chỉ tin nhắn của assistant mới có trích dẫn. */
  citations?: Citation[];
}
