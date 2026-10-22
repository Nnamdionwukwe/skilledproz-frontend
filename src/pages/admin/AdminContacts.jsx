// src/pages/admin/AdminContacts.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  FiMail,
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiExternalLink,
  FiTrash2,
  FiInbox,
  FiChevronLeft,
  FiChevronRight,
  FiEye,
  FiSend,
} from "react-icons/fi";
import AdminLayout from "../../components/layout/AdminLayout";
import { supportApi } from "../../lib/supportApi";
import styles from "./AdminContacts.module.css";

export default function AdminContacts() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Viewing state
  const [selectedMessage, setSelectedMessage] = useState(null);

  const LIMIT = 10;

  const fetchMessages = useCallback(
    async (pg = 1, status = statusFilter) => {
      setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (status) params.status = status;

        const res = await supportApi.adminListContactMessages(params);
        const data = res.data.data;

        setMessages(data.messages || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
        setPage(pg);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    fetchMessages(1, statusFilter);
  }, [fetchMessages, statusFilter]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await supportApi.adminUpdateContactStatus(id, { status: newStatus });
      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m)),
      );
      if (selectedMessage?.id === id) {
        setSelectedMessage((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const filteredMessages = messages.filter((m) =>
    `${m.name} ${m.email} ${m.subject}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return (
          <span className={`${styles.badge} ${styles.badge_pending}`}>
            <FiClock size={12} /> Pending
          </span>
        );
      case "REVIEWED":
        return (
          <span className={`${styles.badge} ${styles.badge_reviewed}`}>
            <FiEye size={12} /> Reviewed
          </span>
        );
      case "RESOLVED":
        return (
          <span className={`${styles.badge} ${styles.badge_resolved}`}>
            <FiCheckCircle size={12} /> Resolved
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              <FiInbox /> Contact Inbox
            </h1>
            <p className={styles.sub}>
              Manage messages from the public contact form.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className={styles.filterBar}>
          <div className={styles.searchWrap}>
            <FiSearch className={styles.searchIcon} size={16} />
            <input
              type="text"
              placeholder="Search by name, email or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.tabs}>
            {[
              { key: "", label: "All" },
              { key: "PENDING", label: "Pending" },
              { key: "REVIEWED", label: "Reviewed" },
              { key: "RESOLVED", label: "Resolved" },
            ].map((t) => (
              <button
                key={t.key}
                className={`${styles.tab} ${statusFilter === t.key ? styles.activeTab : ""}`}
                onClick={() => {
                  setStatusFilter(t.key);
                  setPage(1);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <span className={styles.totalPill}>{total} messages</span>
        </div>

        {/* Table Area */}
        <div className={styles.tableWrap}>
          <div className={styles.tableHead}>
            <span>Sender</span>
            <span>Subject</span>
            <span>Date</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          <div className={styles.tableBody}>
            {loading ? (
              // Skeleton Loader
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={styles.skRow}
                  style={{ animationDelay: `${i * 40}ms` }}
                />
              ))
            ) : filteredMessages.length === 0 ? (
              <div className={styles.emptyState}>
                <FiInbox size={32} />
                <p>No messages found</p>
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <div key={msg.id} className={styles.row}>
                  <div className={styles.userCell}>
                    <div className={styles.avatar}>
                      {msg.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{msg.name}</span>
                      <span className={styles.userEmail}>{msg.email}</span>
                    </div>
                  </div>

                  <div className={styles.subjectCell}>
                    <span className={styles.subject}>
                      {msg.subject || "No subject"}
                    </span>
                    <span className={styles.preview}>
                      {msg.message.slice(0, 50)}...
                    </span>
                  </div>

                  <span className={styles.dateCell}>
                    {formatDate(msg.createdAt)}
                  </span>

                  <div>{getStatusBadge(msg.status)}</div>

                  <div className={styles.actions}>
                    <button
                      className={styles.viewBtn}
                      onClick={() => setSelectedMessage(msg)}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page === 1 || loading}
              onClick={() => fetchMessages(page - 1)}
            >
              <FiChevronLeft /> Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {pages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages || loading}
              onClick={() => fetchMessages(page + 1)}
            >
              Next <FiChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* ── Message Detail Modal ── */}
      {selectedMessage && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSelectedMessage(null)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Message Details</h2>
              <button
                className={styles.closeBtn}
                onClick={() => setSelectedMessage(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Sender</span>
                  <span className={styles.detailVal}>
                    {selectedMessage.name}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Email</span>
                  <a
                    href={`mailto:${selectedMessage.email}`}
                    className={styles.emailLink}
                  >
                    {selectedMessage.email} <FiExternalLink size={12} />
                  </a>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Subject</span>
                  <span className={styles.detailVal}>
                    {selectedMessage.subject || "—"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Date</span>
                  <span className={styles.detailVal}>
                    {formatDate(selectedMessage.createdAt)}
                  </span>
                </div>
              </div>

              <div className={styles.messageBox}>
                <span className={styles.detailLabel}>Message</span>
                <p className={styles.messageText}>{selectedMessage.message}</p>
              </div>

              <div className={styles.modalActions}>
                <div className={styles.statusSelectWrap}>
                  <label>Status:</label>
                  <select
                    value={selectedMessage.status}
                    onChange={(e) =>
                      handleStatusChange(selectedMessage.id, e.target.value)
                    }
                    className={styles.statusSelect}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="REVIEWED">Reviewed</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>

                <a
                  href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject || "Your message to SkilledProz"}`}
                  className={styles.replyBtn}
                >
                  <FiSend size={16} /> Reply via Email
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
