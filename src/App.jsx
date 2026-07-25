import React, { useState, useEffect } from 'react';
import { 
  ArrowRightLeft, 
  Wallet, 
  PlusCircle, 
  Droplet, 
  LogOut, 
  User, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Shield, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  TrendingUp,
  CreditCard,
  RefreshCw,
  Copy,
  X
} from 'lucide-react';
import './App.css';

function App() {
  // Navigation State: 'landing' | 'login' | 'register' | 'dashboard'
  const [view, setView] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? 'dashboard' : 'landing';
  });

  // Auth State
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || '';
  });

  // Auth Forms State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  // Dashboard Data State
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Modal States
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showFaucetModal, setShowFaucetModal] = useState(false);
  
  // Transfer Form State
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0); // 0 = Idle, 1 = Processing, 2 = Success, 3 = Error
  const [transferMessage, setTransferMessage] = useState('');

  // Faucet Form State
  const [faucetToAccount, setFaucetToAccount] = useState('');
  const [faucetAmount, setFaucetAmount] = useState('10000');
  const [isFunding, setIsFunding] = useState(false);

  // Custom Card Form State
  const [showIssueCardModal, setShowIssueCardModal] = useState(false);
  const [newCardBankName, setNewCardBankName] = useState('SimpleBank');
  const [newCardCurrency, setNewCardCurrency] = useState('INR');
  const [newCardColor, setNewCardColor] = useState('blue');
  const [newCardType, setNewCardType] = useState('DEBIT');

  // Toast Notifications State
  const [toasts, setToasts] = useState([]);

  // Utility: Show Toast Alert
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Helper: Request headers
  const getHeaders = (customToken = null) => {
    const activeToken = customToken || token;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return headers;
  };

  // Generate unique idempotency key
  const makeIdempotencyKey = (prefix = 'tx') => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  };

  // Fetch Accounts and their Balances
  const fetchAccounts = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/accounts', { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch accounts');
      
      const data = await res.json();
      if (data.account && Array.isArray(data.account)) {
        // Query balances sequentially/concurrently
        const accountsWithBalance = await Promise.all(
          data.account.map(async (acc) => {
            try {
              const balRes = await fetch(`/api/accounts/balance/${acc._id}`, { headers: getHeaders() });
              if (balRes.ok) {
                const balData = await balRes.json();
                return { ...acc, balance: balData.balance };
              }
            } catch (err) {
              console.error(`Balance error for account ${acc._id}:`, err);
            }
            return { ...acc, balance: 0 };
          })
        );
        setAccounts(accountsWithBalance);
        
        // Auto-select first account as transfer sender if not set
        if (accountsWithBalance.length > 0 && !transferFrom) {
          setTransferFrom(accountsWithBalance[0]._id);
          setFaucetToAccount(accountsWithBalance[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Could not load accounts list.', 'error');
    }
  };

  // Fetch Transaction History
  const fetchTransactions = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/transaction', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.transactions) {
          setTransactions(data.transactions);
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Could not retrieve transaction history.', 'error');
    }
  };

  // Refresh all dashboard metrics
  const refreshDashboardData = async () => {
    setLoadingData(true);
    await Promise.all([fetchAccounts(), fetchTransactions()]);
    setLoadingData(false);
  };

  // Load dashboard data on login / mount
  useEffect(() => {
    if (user && token) {
      refreshDashboardData();
    }
  }, [user, token]);

  // Handle Login Submission
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showToast('Please enter email and password.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Login failed.');
      }
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setView('dashboard');
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      
      // Clean forms
      setLoginEmail('');
      setLoginPassword('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Handle Register Submission
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerName || !registerEmail || !registerPassword) {
      showToast('Please complete all form fields.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: registerName, email: registerEmail, password: registerPassword })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed.');
      }
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setView('dashboard');
      showToast('Registration successful! Welcome aboard.', 'success');
      
      // Clean forms
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      // call logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getHeaders()
      });
    } catch (e) {
      console.error("Logout endpoint failure", e);
    }
    
    // clear local variables
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setAccounts([]);
    setTransactions([]);
    setView('landing');
    showToast('Logged out successfully.', 'info');
  };

  // Handle Creating a New Bank Card (Client-side customized metadata stored in LocalStorage)
  const handleCreateAccount = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ currency: newCardCurrency })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Failed to create account.');
      
      // Save custom card metadata in local storage keyed by the newly created account ID
      const cardMeta = {
        bankName: newCardBankName || 'SimpleBank',
        cardColor: newCardColor || 'blue',
        cardType: newCardType || 'DEBIT',
        currency: newCardCurrency || 'INR'
      };
      localStorage.setItem(`card_meta_${data.account._id}`, JSON.stringify(cardMeta));

      showToast('New customized bank card issued successfully!', 'success');
      setShowIssueCardModal(false);
      
      // Reset form variables to defaults
      setNewCardBankName('SimpleBank');
      setNewCardCurrency('INR');
      setNewCardColor('blue');
      setNewCardType('DEBIT');
      
      refreshDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Handle Funds Transfer
  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferFrom) {
      showToast('Please select a sender account.', 'error');
      return;
    }
    if (!transferTo) {
      showToast('Please enter the target account ID.', 'error');
      return;
    }
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      showToast('Please enter a valid transfer amount.', 'error');
      return;
    }

    const sourceAccount = accounts.find(a => a._id === transferFrom);
    if (sourceAccount && sourceAccount.balance < parseFloat(transferAmount)) {
      showToast('Insufficient funds in the selected account.', 'error');
      return;
    }

    try {
      setIsTransferring(true);
      setTransferProgress(1); // Processing
      setTransferMessage('Submitting ledger instruction to network...');

      const key = makeIdempotencyKey('tx');
      const res = await fetch('/api/transaction', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          fromAccount: transferFrom,
          toAccount: transferTo,
          amount: parseFloat(transferAmount),
          idempotencyKey: key
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Transaction processing failed.');
      }

      setTransferProgress(2); // Success
      setTransferMessage('Transaction completed successfully! Ledger updated.');
      showToast('Transfer completed successfully.', 'success');
      
      // Reset transfer inputs
      setTransferTo('');
      setTransferAmount('');
      
      // Refresh dashboard data
      refreshDashboardData();
    } catch (err) {
      setTransferProgress(3); // Error
      setTransferMessage(err.message || 'Network ledger rejected the transaction.');
      showToast(err.message || 'Transfer failed.', 'error');
    } finally {
      setIsTransferring(false);
    }
  };

  // Handle Faucet Testing Funds
  const handleFaucet = async (e) => {
    e.preventDefault();
    if (!faucetToAccount) {
      showToast('Please select an account to fund.', 'error');
      return;
    }
    if (!faucetAmount || parseFloat(faucetAmount) <= 0) {
      showToast('Please specify a positive faucet amount.', 'error');
      return;
    }

    setIsFunding(true);
    try {
      // Call the initial funds endpoint using regular token
      const key = makeIdempotencyKey('faucet');
      const faucetRes = await fetch('/api/transaction/system/initial-funds', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          toAccount: faucetToAccount,
          amount: parseFloat(faucetAmount),
          idempotencyKey: key
        })
      });

      const faucetData = await faucetRes.json();

      if (!faucetRes.ok) {
        throw new Error(faucetData.message || 'Faucet funding failed.');
      }

      showToast(`Deposited ${parseFloat(faucetAmount).toLocaleString()} INR into account!`, 'success');
      setShowFaucetModal(false);
      refreshDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsFunding(false);
    }
  };

  // Helper: Copy Account ID
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} ID to clipboard!`, 'info');
  };

  // Helper: Get total balance
  const getTotalBalance = () => {
    return accounts.reduce((acc, current) => acc + (current.balance || 0), 0);
  };

  return (
    <>
      {/* Toast Notification Area */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' && <CheckCircle2 size={16} />}
            {toast.type === 'error' && <AlertCircle size={16} />}
            {toast.type === 'info' && <Shield size={16} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Nav Bar */}
      <header className="navbar">
        <div className="brand" onClick={() => setView(user ? 'dashboard' : 'landing')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/favicon.svg" alt="Ledger Vault Logo" className="brand-logo-img" style={{ width: 30, height: 30, borderRadius: 8 }} />
          <span>Ledger Vault</span>
        </div>
        <div className="user-profile">
          {user ? (
            <>
              <div className="avatar-badge">
                <User size={14} />
                <span>{user.name}</span>
              </div>
              <button className="btn btn-secondary btn-danger" onClick={handleLogout} style={{ padding: '8px 14px' }}>
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              {view !== 'login' && view !== 'register' && (
                <button className="btn btn-primary" onClick={() => setView('login')}>Sign In</button>
              )}
            </>
          )}
        </div>
      </header>

      {/* LANDING VIEW */}
      {view === 'landing' && (
        <main className="welcome-container">
          <div className="welcome-hero">
            <span className="welcome-badge">Secure Ledger Architecture</span>
            <h1 className="welcome-title">The Next Generation of Decentralized Ledgers</h1>
            <p className="welcome-desc">
              Experience dynamic, multi-account banking built on top of immutable ledger aggregations, dual-entry accounting, and robust cryptographic session protocols.
            </p>
            <div className="welcome-actions">
              <button className="btn btn-primary btn-accent" onClick={() => setView('register')}>Open Free Account</button>
              <button className="btn btn-secondary" onClick={() => setView('login')}>Sign In to Console</button>
            </div>
          </div>

          <div className="features-grid">
            <div className="feature-box glass-panel">
              <Shield size={28} />
              <h3 className="feature-title">Double-Entry Aggregations</h3>
              <p className="feature-desc">Balances are computed instantly via immutable transaction registers. Zero floating variables, zero reconciliation issues.</p>
            </div>
            <div className="feature-box glass-panel">
              <ArrowRightLeft size={28} />
              <h3 className="feature-title">Atomic Money Routing</h3>
              <p className="feature-desc">All transactions execute through strict Mongo session gates, guaranteeing atomic deposits and withdrawals.</p>
            </div>
            <div className="feature-box glass-panel">
              <TrendingUp size={28} />
              <h3 className="feature-title">Real-Time Auditing</h3>
              <p className="feature-desc">Review debits, credits, and target accounts inside your live dashboard timeline with complete transparency.</p>
            </div>
          </div>
        </main>
      )}

      {/* LOGIN VIEW */}
      {view === 'login' && (
        <main className="auth-container">
          <div className="auth-card glass-panel">
            <h2 className="auth-title">Welcome Back</h2>
            <p className="auth-subtitle">Sign in to manage your bank accounts and ledgers</p>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="name@example.com" 
                  value={loginEmail} 
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="••••••••" 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                Access Ledger Console
              </button>
            </form>
            <p className="form-footer">
              Don't have an account? 
              <a href="#" className="form-link" onClick={(e) => { e.preventDefault(); setView('register'); }}>Create an account</a>
            </p>
          </div>
        </main>
      )}

      {/* REGISTER VIEW */}
      {view === 'register' && (
        <main className="auth-container">
          <div className="auth-card glass-panel">
            <h2 className="auth-title">Establish Ledger Profile</h2>
            <p className="auth-subtitle">Open secure digital vaults on Ledger Vault today</p>
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="John Doe" 
                  value={registerName} 
                  onChange={(e) => setRegisterName(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="john@example.com" 
                  value={registerEmail} 
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password (Min. 6 chars)</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="••••••••" 
                  value={registerPassword} 
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                Initialize Security Keys
              </button>
            </form>
            <p className="form-footer">
              Already registered? 
              <a href="#" className="form-link" onClick={(e) => { e.preventDefault(); setView('login'); }}>Sign in</a>
            </p>
          </div>
        </main>
      )}

      {/* DASHBOARD VIEW */}
      {view === 'dashboard' && user && (
        <main className="dashboard-grid">
          
          {/* Quick Stats Summary Banner */}
          <section className="stats-row full-width">
            <div className="stat-card glass-panel">
              <div className="stat-info">
                <span className="stat-label">Net Consolidated Balance</span>
                <span className="stat-value">{getTotalBalance().toLocaleString()} INR</span>
              </div>
              <div className="stat-icon-wrapper stat-icon-primary">
                <Wallet size={20} />
              </div>
            </div>

            <div className="stat-card glass-panel">
              <div className="stat-info">
                <span className="stat-label">Active Virtual Accounts</span>
                <span className="stat-value">{accounts.length}</span>
              </div>
              <div className="stat-icon-wrapper stat-icon-secondary">
                <CreditCard size={20} />
              </div>
            </div>

            <div className="stat-card glass-panel">
              <div className="stat-info">
                <span className="stat-label">Ledger Synchronizations</span>
                <span className="stat-value">Active</span>
              </div>
              <div className="stat-icon-wrapper stat-icon-accent">
                <RefreshCw size={20} className={loadingData ? "spin" : ""} style={{ cursor: 'pointer' }} onClick={refreshDashboardData} />
              </div>
            </div>
          </section>

          {/* Left Column: Bank Cards List */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div className="section-header">
                <h3 className="section-title">My Banking Cards</h3>
                <button className="btn btn-secondary btn-accent" onClick={() => setShowIssueCardModal(true)} style={{ padding: '6px 12px', fontSize: '12px' }}>
                  <PlusCircle size={14} />
                  <span>Issue Card</span>
                </button>
              </div>

              {accounts.length === 0 ? (
                <div className="empty-state">
                  <CreditCard size={40} />
                  <p>You do not have any bank accounts yet.</p>
                  <button className="btn btn-primary" onClick={() => setShowIssueCardModal(true)}>Create Your First Account</button>
                </div>
              ) : (
                <div className="cards-container">
                  {accounts.map((acc, index) => {
                    const metaStr = localStorage.getItem(`card_meta_${acc._id}`);
                    const meta = metaStr ? JSON.parse(metaStr) : {
                      bankName: 'SimpleBank',
                      cardColor: index % 3 === 0 ? 'blue' : index % 3 === 1 ? 'green' : 'slate',
                      cardType: 'DEBIT',
                      currency: acc.currency || 'INR'
                    };
                    return (
                      <div 
                        key={acc._id} 
                        className={`bank-card bank-card-gradient-${meta.cardColor || 'blue'}`}
                        onClick={() => copyToClipboard(acc._id, 'Account')}
                        title="Click to copy account ID"
                      >
                        <div className="card-header-logo">
                          <span className="card-brand-name">{meta.bankName || 'SimpleBank'}</span>
                          <div className="card-chip"></div>
                        </div>

                        <div className="card-balance-section">
                          <span className="card-balance-label">Balance</span>
                          <span className="card-balance-val">
                            {(acc.balance || 0).toLocaleString()} {meta.currency || acc.currency || 'INR'}
                          </span>
                        </div>

                        <div className="card-footer-info">
                          <span className="card-id">
                            {acc._id.slice(0, 4)} ... {acc._id.slice(-6)}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '10px', opacity: 0.8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {meta.cardType || 'DEBIT'}
                            </span>
                            <span className={`card-status-pill ${acc.status.toLowerCase()}`}>
                              {acc.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions Panel */}
            <div className="glass-panel quick-actions-panel">
              <h3 className="section-title" style={{ margin: 0 }}>Terminal Console</h3>
              <div className="quick-actions-grid">
                <button 
                  className="quick-action-btn" 
                  onClick={() => {
                    if (accounts.length === 0) {
                      showToast('Please create a bank account first.', 'error');
                      return;
                    }
                    setShowTransferModal(true);
                  }}
                >
                  <ArrowRightLeft size={24} />
                  <span className="quick-action-label">New Transfer</span>
                </button>
                <button 
                  className="quick-action-btn accent" 
                  onClick={() => {
                    if (accounts.length === 0) {
                      showToast('Please create a bank account first.', 'error');
                      return;
                    }
                    setShowFaucetModal(true);
                  }}
                >
                  <Droplet size={24} />
                  <span className="quick-action-label">Test Faucet</span>
                </button>
              </div>
            </div>
          </section>

          {/* Right Column: Ledger Timeline */}
          <section>
            <div className="glass-panel ledger-panel">
              <div className="ledger-header">
                <h3 className="section-title">Audit Ledger Feed</h3>
                <Clock size={16} className="text-muted" />
              </div>

              {transactions.length === 0 ? (
                <div className="empty-state" style={{ flexGrow: 1 }}>
                  <Clock size={32} />
                  <p style={{ fontSize: '13px' }}>No ledger entries found on network</p>
                </div>
              ) : (
                <div className="ledger-timeline">
                  {transactions.map((tx) => {
                    // Determine if credit or debit from user perspective
                    const isSender = accounts.some(acc => acc._id === tx.fromAccount?._id);
                    const isReceiver = accounts.some(acc => acc._id === tx.toAccount?._id);
                    let type = 'debit';
                    let titleText = 'Outgoing Transfer';
                    
                    if (isReceiver && !isSender) {
                      type = 'credit';
                      titleText = 'Incoming Deposit';
                    } else if (isSender && isReceiver) {
                      titleText = 'Self Transfer';
                    }

                    // Sender and receiver name display helpers
                    const fromName = tx.fromAccount?.user?.name || 'External Account';
                    const toName = tx.toAccount?.user?.name || 'External Account';

                    return (
                      <div key={tx._id} className="ledger-item">
                        <div className="ledger-meta">
                          <div className={`ledger-icon-box ledger-icon-${type}`}>
                            {type === 'debit' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                          </div>
                          <div className="ledger-desc">
                            <span className="ledger-title">{titleText}</span>
                            <span className="ledger-sub">
                              {type === 'debit' ? `to: ${toName}` : `from: ${fromName}`}
                            </span>
                            <span className="ledger-date">
                              {new Date(tx.createdAt).toLocaleString(undefined, {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="ledger-financials">
                          <span className={`ledger-amount ${type}`}>
                            {type === 'debit' ? '-' : '+'}{tx.amount.toLocaleString()} INR
                          </span>
                          <span className={`ledger-status ${tx.status.toLowerCase()}`}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

        </main>
      )}

      {/* TRANSFER MODAL */}
      {showTransferModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <button className="modal-close-btn" onClick={() => { setShowTransferModal(false); setTransferProgress(0); }}>
              <X size={20} />
            </button>
            <h3 className="modal-title">Initiate Assets Transfer</h3>
            
            {transferProgress === 0 ? (
              <form onSubmit={handleTransfer}>
                <div className="form-group">
                  <label className="form-label">Debit Source Account</label>
                  <select 
                    className="form-control"
                    value={transferFrom}
                    onChange={(e) => setTransferFrom(e.target.value)}
                  >
                    {accounts.map((acc, idx) => {
                      const metaStr = localStorage.getItem(`card_meta_${acc._id}`);
                      const meta = metaStr ? JSON.parse(metaStr) : {
                        bankName: 'SimpleBank',
                        currency: acc.currency || 'INR'
                      };
                      return (
                        <option key={acc._id} value={acc._id}>
                          {meta.bankName || 'SimpleBank'} - {acc._id.slice(-8)} (Bal: {acc.balance.toLocaleString()} {meta.currency || acc.currency || 'INR'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Beneficiary Account ID</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Enter 24-character Account MongoDB ID" 
                    value={transferTo} 
                    onChange={(e) => setTransferTo(e.target.value)}
                    required 
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
                    Double check the recipient ID to avoid asset lockups.
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount (INR)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="0.00" 
                    value={transferAmount} 
                    onChange={(e) => setTransferAmount(e.target.value)}
                    min="1"
                    required 
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                  Execute Ledger Entries
                </button>
              </form>
            ) : (
              <div className="pending-overlay">
                {transferProgress === 1 && (
                  <>
                    <div className="spinner"></div>
                    <h4 style={{ margin: '8px 0 0 0' }}>Transaction Processing</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{transferMessage}</p>
                    <div className="progress-bar-container">
                      <div className="progress-bar"></div>
                    </div>
                  </>
                )}
                {transferProgress === 2 && (
                  <>
                    <CheckCircle2 size={48} style={{ color: 'var(--secondary)' }} />
                    <h4 style={{ margin: '8px 0 0 0' }}>Transfer Complete</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{transferMessage}</p>
                    <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => { setShowTransferModal(false); setTransferProgress(0); }}>
                      Return to Dashboard
                    </button>
                  </>
                )}
                {transferProgress === 3 && (
                  <>
                    <AlertCircle size={48} style={{ color: 'var(--danger)' }} />
                    <h4 style={{ margin: '8px 0 0 0' }}>Transfer Rejected</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{transferMessage}</p>
                    <button className="btn btn-secondary" style={{ marginTop: '12px' }} onClick={() => setTransferProgress(0)}>
                      Adjust Parameters and Retry
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TEST FAUCET MODAL */}
      {showFaucetModal && (() => {
        const selectedFaucetAccount = accounts.find(acc => acc._id === faucetToAccount);
        const faucetCurrency = (() => {
          if (!selectedFaucetAccount) return 'INR';
          const metaStr = localStorage.getItem(`card_meta_${selectedFaucetAccount._id}`);
          if (metaStr) {
            try {
              const meta = JSON.parse(metaStr);
              return meta.currency || selectedFaucetAccount.currency || 'INR';
            } catch (e) {}
          }
          return selectedFaucetAccount.currency || 'INR';
        })();

        return (
          <div className="modal-overlay">
            <div className="modal-content glass-panel">
              <button className="modal-close-btn" onClick={() => setShowFaucetModal(false)}>
                <X size={20} />
              </button>
              <h3 className="modal-title">Test Funds Faucet</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Fund your testing account with mock assets from the SimpleBank central system bank reservoir.
              </p>

              <form onSubmit={handleFaucet}>
                <div className="form-group">
                  <label className="form-label">Beneficiary Account</label>
                  <select 
                    className="form-control"
                    value={faucetToAccount}
                    onChange={(e) => setFaucetToAccount(e.target.value)}
                  >
                    {accounts.map((acc, idx) => {
                      const metaStr = localStorage.getItem(`card_meta_${acc._id}`);
                      const meta = metaStr ? JSON.parse(metaStr) : {
                        bankName: 'SimpleBank',
                        currency: acc.currency || 'INR'
                      };
                      return (
                        <option key={acc._id} value={acc._id}>
                          {meta.bankName || 'SimpleBank'} - {acc._id.slice(-8)} (Bal: {acc.balance.toLocaleString()} {meta.currency || acc.currency || 'INR'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Deposit Sum ({faucetCurrency})</label>
                  <select 
                    className="form-control"
                    value={faucetAmount}
                    onChange={(e) => setFaucetAmount(e.target.value)}
                  >
                    <option value="500">500 {faucetCurrency}</option>
                    <option value="5000">5,000 {faucetCurrency}</option>
                    <option value="10000">10,000 {faucetCurrency}</option>
                    <option value="50000">50,000 {faucetCurrency}</option>
                    <option value="100000">100,000 {faucetCurrency}</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={isFunding}>
                  {isFunding ? 'Logging into Faucet...' : 'Inject Test Funds'}
                </button>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ISSUE CARD MODAL */}
      {showIssueCardModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '420px' }}>
            <button className="modal-close-btn" onClick={() => setShowIssueCardModal(false)}>
              <X size={20} />
            </button>
            <h3 className="modal-title">Issue New Bank Card</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Configure your card attributes. Custom details are persisted locally.
            </p>

            <form onSubmit={handleCreateAccount}>
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newCardBankName} 
                  onChange={(e) => setNewCardBankName(e.target.value)}
                  placeholder="e.g. Chase, HDFC, SimpleBank"
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Currency</label>
                <select 
                  className="form-control"
                  value={newCardCurrency}
                  onChange={(e) => setNewCardCurrency(e.target.value)}
                >
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Card Type</label>
                <select 
                  className="form-control"
                  value={newCardType}
                  onChange={(e) => setNewCardType(e.target.value)}
                >
                  <option value="DEBIT">Debit Card</option>
                  <option value="CREDIT">Credit Card</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Card Color Theme</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px', justifyContent: 'center' }}>
                  {[
                    { value: 'blue', color: 'linear-gradient(135deg, #2563eb, #1d4ed8)', label: 'Blue' },
                    { value: 'green', color: 'linear-gradient(135deg, #059669, #047857)', label: 'Green' },
                    { value: 'purple', color: 'linear-gradient(135deg, #7c3aed, #6d28d9)', label: 'Purple' },
                    { value: 'orange', color: 'linear-gradient(135deg, #ea580c, #c2410c)', label: 'Orange' },
                    { value: 'slate', color: 'linear-gradient(135deg, #475569, #334155)', label: 'Slate' },
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      type="button"
                      onClick={() => setNewCardColor(theme.value)}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: theme.color,
                        border: newCardColor === theme.value ? '2.5px solid var(--text-primary)' : '2.5px solid transparent',
                        cursor: 'pointer',
                        boxShadow: 'inset 0 0 5px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s ease',
                        transform: newCardColor === theme.value ? 'scale(1.15) translateY(-2px)' : 'scale(1)'
                      }}
                      title={theme.label}
                    />
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '24px' }}>
                Issue Card
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
