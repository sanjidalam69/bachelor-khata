/**
 * ব্যাচেলর খাতা — Bachelor Khata
 * Full-featured Bengali finance tracker for bachelors
 */

class BachelorKhata {
  constructor() {
    this.page = 'dashboard';
    this.month = new Date().getMonth();
    this.year  = new Date().getFullYear();
    this.calMonth = this.month;
    this.calYear  = this.year;
    this.charts = {};
    this.tags = [];
    this.spMembers = [];
    this.activeMessSubtab = 'summary';
    this.lang = 'bn';

    this.data = {
      transactions: JSON.parse(localStorage.getItem('bk_tx')   || '[]'),
      accounts:     JSON.parse(localStorage.getItem('bk_acc')  || '[]'),
      budgets:      JSON.parse(localStorage.getItem('bk_bud')  || '{}'),
      goals:        JSON.parse(localStorage.getItem('bk_goal') || '[]'),
      debts:        JSON.parse(localStorage.getItem('bk_debt') || '[]'),
      mess:         JSON.parse(localStorage.getItem('bk_mess') || '{"members":[],"entries":[]}'),
      bazar:        JSON.parse(localStorage.getItem('bk_bazar')|| '[]'),
      splits:       JSON.parse(localStorage.getItem('bk_split')|| '[]'),
      settings:     JSON.parse(localStorage.getItem('bk_set')  || '{"initials":"SA","theme":"dark"}'),
      lastReadChatCount: parseInt(localStorage.getItem('bk_chat_read') || '0', 10)
    };

    if (!this.data.settings.syncId) this.data.settings.syncId = '';
    if (!this.data.settings.syncEditKey) this.data.settings.syncEditKey = '';
    if (!this.data.settings.lastSync) this.data.settings.lastSync = '';

    // Default accounts seed
    if (!this.data.accounts.length) {
      this.data.accounts = [
        { id: this.uid(), name: 'নগদ', type: 'cash', balance: 0, color: '#10b981' },
        { id: this.uid(), name: 'বিকাশ', type: 'bkash', balance: 0, color: '#f97316' },
        { id: this.uid(), name: 'ব্যাংক', type: 'bank', balance: 0, color: '#3b82f6' },
      ];
      this.save('accounts');
    }

    // Ensure mess structure
    if (!this.data.mess.members) {
      this.data.mess.members = [];
      this.data.mess.entries = [];
    }
    if (!this.data.mess.subcategories) {
      this.data.mess.subcategories = {
        "বাজার": ["সবজি", "ফল", "মাছ", "মাংস", "পেঁয়াজ", "মরিচ", "আলু", "হলুদ"],
        "অন্যান্য": []
      };
      this.save('mess');
    }

    this.init();
  }

  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
  save(k) {
    const m = { transactions:'bk_tx', accounts:'bk_acc', budgets:'bk_bud', goals:'bk_goal', debts:'bk_debt', mess:'bk_mess', bazar:'bk_bazar', splits:'bk_split', settings:'bk_set' };
    localStorage.setItem(m[k], JSON.stringify(this.data[k]));
    
    // Auto cloud upload if syncId is active
    if (this.data.settings.syncId && k !== 'settings') {
      this.cloudUpload().catch(err => console.error("Cloud upload error:", err));
    }
  }

  // ── INIT ──────────────────────────────────────────────────────
  init() {
    this.applyTheme();
    this.applyProfile();
    this.bindNav();
    this.bindMonthTabs();
    this.bindForms();
    this.bindModals();
    this.bindFilters();
    this.bindTagInput();
    this.bindSplitInput();
    this.bindProfile();
    this.bindCalendar();
    this.bindBazar();
    this.processRecurring();
    const today = new Date().toISOString().split('T')[0];
    ['f-date','q-date','me-date','sp-date'].forEach(id => { const el = g(id); if(el) el.value = today; });
    this.bindSync();
    this.bindChat();
    if(this.data.settings.syncId) {
      this.cloudDownload().catch(err => console.error("Initial sync error:", err));
      this.initNotifications().then(() => {
        this.startBackgroundChatPoll();
      });
    }
    // Auto-refresh active roommates and data every 10 seconds
    setInterval(() => {
      if (this.data.settings.syncId) {
        this.syncActiveRoommates().catch(() => {});
        this.cloudDownload(true).catch(() => {});
      }
    }, 10000);
    this.translatePage();
    this.render();
  }

  async initNotifications() {
    const LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
    if (!LN) return;

    try {
      const perm = await LN.requestPermissions();
      console.log('Notification permission:', JSON.stringify(perm));

      // Create high-importance channel
      if (LN.createChannel) {
        await LN.createChannel({
          id: 'bachelor_khata_chat',
          name: 'Chat Messages',
          description: 'Notifications for new chat messages from Bachelor Khata',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#38bdf8'
        });
        console.log('Notification channel created: bachelor_khata_chat');
      }
    } catch (e) {
      console.error('initNotifications error:', JSON.stringify(e));
    }
  }
  
  startBackgroundChatPoll() {
    if (!this.data.settings.syncId) return;
    if (this.chatPollInterval) clearInterval(this.chatPollInterval);
    
    this.lastNotifiedChatCount = undefined;
    this.checkBackgroundNotifications();
    
    this.chatPollInterval = setInterval(() => {
      this.checkBackgroundNotifications();
    }, 8000);
  }

  async checkBackgroundNotifications() {
    const syncId = this.data.settings.syncId;
    if (!syncId) return;

    try {
      const res = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/swnr32ym/bk_chat_${syncId}`);
      if (res.ok) {
        const text = await res.text();
        let msgs = [];
        if (text && text !== '""' && text !== 'null' && text.trim() !== '') {
          try {
            let parsed = JSON.parse(text);
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
            if (Array.isArray(parsed)) {
              msgs = parsed.filter(m => m && typeof m === 'object');
            }
          } catch(err) {
            msgs = [];
          }
        }

        const currentCount = msgs.length;
        
        // If user is actively viewing chat screen, just update screen and don't notify
        if (this.page === 'chat' && !document.hidden) {
          this.chatMsgsCount = currentCount;
          localStorage.setItem('bk_chat_read', currentCount.toString());
          this.lastNotifiedChatCount = currentCount;
          this.renderChatMessages(msgs);
          return;
        }

        // Initialize baseline if not set yet
        if (this.lastNotifiedChatCount === undefined) {
          this.lastNotifiedChatCount = currentCount;
          return;
        }

        // Check if there are new messages
        if (currentCount > this.lastNotifiedChatCount) {
          const newMsgs = msgs.slice(this.lastNotifiedChatCount);
          const myInitials = this.data.settings.initials || 'SA';
          const remoteMsgs = newMsgs.filter(m => m.sender && m.sender !== myInitials);
          
          if (remoteMsgs.length > 0) {
            const lastMsg = remoteMsgs[remoteMsgs.length - 1];
            const decodedText = this._decodeMsg(lastMsg.text);
            this.showLocalNotification(lastMsg.sender, decodedText);
          }
          this.lastNotifiedChatCount = currentCount;
        }
      }
    } catch(e) {
      console.error("Background notification poll failed:", e);
    }
  }

  showLocalNotification(sender, text) {
    const LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
    if (!LN) return;

    const notifId = Math.floor(Math.random() * 10000) + 1;
    LN.schedule({
      notifications: [{
        id: notifId,
        title: `${sender} — ব্যাচেলর খাতা`,
        body: text || '(নতুন মেসেজ)',
        channelId: 'bachelor_khata_chat',
        smallIcon: 'ic_notification',
        sound: 'default',
        extra: { sender, text }
      }]
    }).then(() => {
      console.log('Notification sent id=' + notifId);
    }).catch(e => {
      console.error('Notification error:', JSON.stringify(e));
    });
  }

  // Helper: safely parse chat data from server (handles double-quoted strings, corrupted data)
  _parseChatData(text) {
    if (!text || text === '""' || text === 'null' || text.trim() === '') return [];
    try {
      let parsed = JSON.parse(text);
      // Server sometimes wraps value in extra quotes
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      if (Array.isArray(parsed)) return parsed.filter(m => m && typeof m === 'object');
      return [];
    } catch(e) {
      return [];
    }
  }

  // Helper: decode text that may be Base64 encoded or raw
  _decodeMsg(str) {
    if (!str) return '';
    try { return decodeURIComponent(escape(atob(str))); }
    catch(e) { return str; }
  }

  // ── NAVIGATION ────────────────────────────────────────────────
  bindNav() {
    document.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => this.navigate(b.dataset.page)));
    g('quick-add-btn')?.addEventListener('click', () => this.openModal('m-quick'));
  }

  navigate(page) {
    this.page = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nbtn,.mnbtn').forEach(b => b.classList.remove('active'));
    g(`page-${page}`)?.classList.add('active');
    document.querySelectorAll(`[data-page="${page}"]`).forEach(b => b.classList.add('active'));
    const titles = {
      dashboard: this.t('dashboard_title'),
      transactions: this.t('transactions_title'),
      accounts: this.t('accounts_title'),
      mess: this.t('mess_title'),
      chat: this.t('chat_title'),
      split: this.t('split_title'),
      budget: this.t('budget_title'),
      goals: this.t('goals_title'),
      debts: this.t('debts_title'),
      reports: this.t('reports_title')
    };
    setText('page-title', titles[page] || page);
    this.renderPage(page);
  }

  renderPage(p) {
    if (p==='dashboard') this.renderDash();
    else if (p==='transactions') this.renderTx();
    else if (p==='accounts') this.renderAccounts();
    else if (p==='mess') this.switchMessSubtab(this.activeMessSubtab || 'summary');
    else if (p==='bazar') this.renderBazar();
    else if (p==='split') this.renderSplits();
    else if (p==='budget') this.renderBudget();
    else if (p==='goals') this.renderGoals();
    else if (p==='debts') this.renderDebts();
    else if (p==='reports') this.renderReports();
    else if (p==='chat') this.renderChat();
  }

  render() { this.renderPage(this.page); }

  // ── MONTH TABS ────────────────────────────────────────────────
  bindMonthTabs() {
    document.querySelectorAll('.mtab').forEach(t => {
      t.addEventListener('click', () => {
        this.month = parseInt(t.dataset.month);
        document.querySelectorAll('.mtab').forEach(tt => tt.classList.remove('active'));
        document.querySelectorAll(`.mtab[data-month="${this.month}"]`).forEach(tt => tt.classList.add('active'));
        this.render();
      });
    });
    document.querySelectorAll(`.mtab[data-month="${this.month}"]`).forEach(t => t.classList.add('active'));
  }

  // ── HELPERS ───────────────────────────────────────────────────
  fmt(n) {
    const loc = this.lang === 'bn' ? 'bn-BD' : 'en-BD';
    return '৳' + Math.round(n||0).toLocaleString(loc);
  }
  fmtK(n) { return Math.abs(n)>=1000 ? '৳'+Math.round(n/1000)+'k' : this.fmt(n); }
  getAcc(id) { return this.data.accounts.find(a => a.id===id); }

  accBal(acc) {
    let b = acc.balance;
    this.data.transactions.forEach(t => {
      if (t.accountId===acc.id) { if(t.type==='income') b+=t.amount; else if(t.type==='expense') b-=t.amount; else if(t.type==='transfer') b-=t.amount; }
      if (t.type==='transfer' && t.toAccountId===acc.id) b+=t.amount;
    });
    return b;
  }

  totalBal() { return this.data.accounts.reduce((s,a) => s+this.accBal(a), 0); }

  accIcon(type) {
    return {cash:'💵',bank:'🏦',bkash:'📱',nagad:'📱',rocket:'📱',card:'💳',savings:'🐷',other:'📂'}[type]||'📂';
  }

  txForMonth(m=this.month, y=this.year) {
    return this.data.transactions.filter(t => {
      if (!t.date) return false;
      const d = new Date(t.date);
      return d.getUTCMonth()===m && d.getUTCFullYear()===y;
    });
  }

  // ── CATEGORIES ────────────────────────────────────────────────
  INCOME_CATS = ['বেতন/বৃত্তি','ফ্রিল্যান্স','পার্টটাইম','পারিবারিক','বোনাস','অন্যান্য আয়'];
  EXPENSE_CATS = ['মেস','খাবার','বাজার','রুম ভাড়া','বিদ্যুৎ বিল','মোবাইল রিচার্জ','ইন্টারনেট','যাতায়াত','পড়াশোনা','বই/ফটোকপি','ওষুধ','পোশাক','বিনোদন','লন্ড্রি','সেলুন','চা/নাস্তা','রেস্তোরাঁ','অন্যান্য'];

  fillCat(id, type) {
    const el = g(id); if (!el) return;
    const cats = type==='income' ? this.INCOME_CATS : this.EXPENSE_CATS;
    el.innerHTML = cats.map(c => `<option value="${c}">${this.tCat(c)}</option>`).join('');
  }

  fillAcc(id, excludeId=null) {
    const el = g(id); if (!el) return;
    el.innerHTML = this.data.accounts.map(a => `<option value="${a.id}" ${a.id===excludeId?'disabled':''}>${this.accIcon(a.type)} ${this.tAccName(a.name)}</option>`).join('');
  }

  // ── FORMS ─────────────────────────────────────────────────────
  bindForms() {
    // Type tabs in add form
    document.querySelectorAll('[data-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.type;
        g('f-type').value = t;
        document.querySelectorAll('[data-type]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.fillCat('f-cat', t);
        g('f-to-g').style.display = t==='transfer' ? '' : 'none';
        g('f-cat-g').style.display = t==='transfer' ? 'none' : '';
      });
    });

    // Quick add type tabs
    document.querySelectorAll('[data-qtype]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.qtype;
        g('q-type').value = t;
        document.querySelectorAll('[data-qtype]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.fillCat('q-cat', t);
      });
    });

    // Recurring checkbox
    g('f-rec')?.addEventListener('change', e => {
      g('f-rec-freq').style.display = e.target.checked ? '' : 'none';
    });

    // Main form
    g('tx-form')?.addEventListener('submit', e => { e.preventDefault(); this.saveTx(); });
    g('q-submit')?.addEventListener('click', () => this.saveQuickTx());
    g('f-cancel')?.addEventListener('click', () => this.cancelEdit());

    // Export CSV
    [g('export-csv'), g('export-csv2')].forEach(el => el?.addEventListener('click', () => this.exportCSV()));

    // Accounts
    g('acc-save')?.addEventListener('click', () => this.saveAccount());
    g('acc-del-btn')?.addEventListener('click', () => this.deleteAccount());
    g('add-acc-btn')?.addEventListener('click', () => this.openAccModal());
    document.querySelectorAll('.clr-opt').forEach(c => {
      c.addEventListener('click', () => {
        document.querySelectorAll('.clr-opt').forEach(cc => cc.classList.remove('sel'));
        c.classList.add('sel');
        g('acc-clr').value = c.dataset.clr;
      });
    });

    // Mess
    g('add-mess-member-btn')?.addEventListener('click', () => this.openMessMemberModal());
    g('add-mess-entry-btn')?.addEventListener('click', () => this.openMessEntry());
    g('mm-save')?.addEventListener('click', () => this.saveMessMember());
    g('me-save')?.addEventListener('click', () => this.saveMessEntry());
    g('me-del-btn')?.addEventListener('click', () => this.deleteMessEntry());
    document.querySelectorAll('[data-metype]').forEach(b => {
      b.addEventListener('click', () => this.toggleMessEntryType(b.dataset.metype));
    });
    g('me-cat')?.addEventListener('change', () => this.updateSubcatDropdown(g('me-cat').value));
    g('me-add-subcat-btn')?.addEventListener('click', () => this.handleAddSubcat());
    g('me-del-subcat-btn')?.addEventListener('click', () => this.handleDeleteSubcat());
    g('me-subcat')?.addEventListener('change', () => this.updateSubcatDeleteButton());

    // Budget
    g('add-budget-btn')?.addEventListener('click', () => this.openModal('m-budget'));
    g('b-save')?.addEventListener('click', () => this.saveBudget());

    // Goals
    g('add-goal-btn')?.addEventListener('click', () => this.openGoalModal());
    g('g-save')?.addEventListener('click', () => this.saveGoal());
    g('g-del-btn')?.addEventListener('click', () => this.deleteGoal());
    document.querySelectorAll('[data-ctype]').forEach(b => {
      b.addEventListener('click', () => {
        g('c-type').value = b.dataset.ctype;
        document.querySelectorAll('[data-ctype]').forEach(bb => bb.classList.remove('active'));
        b.classList.add('active');
      });
    });
    g('c-save')?.addEventListener('click', () => this.contributeGoal());

    // Debts
    g('add-debt-btn')?.addEventListener('click', () => this.openDebtModal());
    g('d-save')?.addEventListener('click', () => this.saveDebt());
    g('d-del-btn')?.addEventListener('click', () => this.deleteDebt());
    document.querySelectorAll('[data-dtype]').forEach(b => {
      b.addEventListener('click', () => {
        g('d-type').value = b.dataset.dtype;
        document.querySelectorAll('[data-dtype]').forEach(bb => bb.classList.remove('active'));
        b.classList.add('active');
      });
    });

    // Split
    g('add-split-btn')?.addEventListener('click', () => this.openSplitModal());
    g('sp-save')?.addEventListener('click', () => this.saveSplit());

    // Bazar edit modal
    g('baz-save')?.addEventListener('click', () => this.saveBazarEdit());
    g('baz-del-btn')?.addEventListener('click', () => this.deleteBazarItem(g('baz-id').value));

    // Init selects
    this.fillCat('f-cat', 'expense');
    this.fillCat('q-cat', 'expense');
    this.fillCat('b-cat', 'expense');
    this.fillAcc('f-acc');
    this.fillAcc('f-to-acc');
    this.fillAcc('q-acc');
  }

  // ── TAG INPUT ─────────────────────────────────────────────────
  bindTagInput() {
    const inp = g('tag-inp'); if (!inp) return;
    inp.addEventListener('keydown', e => {
      if (e.key==='Enter'||e.key===',') {
        e.preventDefault();
        const v = inp.value.trim().replace(/^#/,'');
        if (v && !this.tags.includes(v)) { this.tags.push(v); this.renderTags(); g('f-tags').value=this.tags.join(','); }
        inp.value='';
      }
      if (e.key==='Backspace'&&!inp.value&&this.tags.length) { this.tags.pop(); this.renderTags(); g('f-tags').value=this.tags.join(','); }
    });
  }

  renderTags() {
    const wrap=g('tag-wrap'); const inp=g('tag-inp'); if(!wrap||!inp) return;
    wrap.querySelectorAll('.tag').forEach(t=>t.remove());
    this.tags.forEach((tag,i) => {
      const el=document.createElement('span'); el.className='tag';
      el.innerHTML=`#${tag}<button type="button" onclick="app.rmTag(${i})"><i class="fas fa-xmark"></i></button>`;
      wrap.insertBefore(el,inp);
    });
  }

  rmTag(i) { this.tags.splice(i,1); this.renderTags(); g('f-tags').value=this.tags.join(','); }

  // ── SPLIT INPUT ───────────────────────────────────────────────
  bindSplitInput() {
    const inp = g('sp-inp'); if (!inp) return;
    inp.addEventListener('keydown', e => {
      if (e.key==='Enter'||e.key===',') {
        e.preventDefault();
        const v = inp.value.trim();
        if (v && !this.spMembers.includes(v)) { this.spMembers.push(v); this.renderSpMembers(); this.calcSplit(); }
        inp.value='';
      }
      if (e.key==='Backspace'&&!inp.value&&this.spMembers.length) { this.spMembers.pop(); this.renderSpMembers(); this.calcSplit(); }
    });
  }

  renderSpMembers() {
    const wrap=g('sp-members-wrap'); const inp=g('sp-inp'); if(!wrap||!inp) return;
    wrap.querySelectorAll('.tag').forEach(t=>t.remove());
    this.spMembers.forEach((m,i) => {
      const el=document.createElement('span'); el.className='tag';
      el.innerHTML=`${m}<button type="button" onclick="app.rmSpMember(${i})"><i class="fas fa-xmark"></i></button>`;
      wrap.insertBefore(el,inp);
    });
    g('sp-members-val').value=this.spMembers.join(',');
  }

  rmSpMember(i) { this.spMembers.splice(i,1); this.renderSpMembers(); this.calcSplit(); }

  calcSplit() {
    const amount = parseFloat(g('sp-amount')?.value)||0;
    const count  = this.spMembers.length;
    const wrap   = g('sp-result-wrap');
    if (!amount||!count) { if(wrap) wrap.style.display='none'; return; }
    if(wrap) wrap.style.display='';
    const perPerson = amount/count;
    setText('sp-per-person', this.fmt(perPerson));
    const ml = g('sp-member-list');
    if(ml) ml.innerHTML = this.spMembers.map(m=>`<div style="display:flex;justify-content:space-between;padding:5px 8px;background:var(--surface);border-radius:var(--rxs);font-size:12px"><span style="font-family:'Hind Siliguri',sans-serif;color:var(--head)">${m}</span><span style="font-weight:800;color:var(--p)">${this.fmt(perPerson)}</span></div>`).join('');
  }

  // ── MODALS ────────────────────────────────────────────────────
  bindModals() {
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => this.closeModal(b.dataset.close)));
    document.querySelectorAll('.mo').forEach(m => m.addEventListener('click', e => { if(e.target===m) this.closeModal(m.id); }));
  }

  openModal(id) {
    if (id==='m-quick') {
      this.fillAcc('q-acc');
      this.fillCat('q-cat', g('q-type')?.value||'expense');
      const today=new Date().toISOString().split('T')[0]; if(g('q-date')&&!g('q-date').value) g('q-date').value=today;
    }
    g(id)?.classList.add('open');
  }

  closeModal(id) { 
    g(id)?.classList.remove('open'); 
  }

  // ── TRANSACTIONS ──────────────────────────────────────────────
  saveTx() {
    const id     = g('f-id').value;
    const type   = g('f-type').value;
    const title  = g('f-title').value.trim();
    const amount = parseFloat(g('f-amount').value)||0;
    const date   = g('f-date').value;
    const accId  = g('f-acc').value;
    const cat    = g('f-cat').value;
    const notes  = g('f-notes').value.trim();
    const tags   = this.tags.slice();
    const rec    = g('f-rec').checked;
    const freq   = g('f-rec-freq').value;
    const toAcc  = g('f-to-acc').value;
    if (!title||!amount||!date||!accId) { this.toast('সব ঘর পূরণ করুন!','error'); return; }
    const tx = { id:id||this.uid(), type, title, amount, date, accountId:accId, category:type==='transfer'?'ট্রান্সফার':cat, notes, tags, recurring:rec, recFreq:rec?freq:null, toAccountId:type==='transfer'?toAcc:null };
    if(id) { this.data.transactions=this.data.transactions.map(t=>t.id===id?tx:t); this.toast('লেনদেন আপডেট হয়েছে!','success'); }
    else { this.data.transactions.push(tx); this.toast('লেনদেন যোগ হয়েছে!','success'); }
    this.save('transactions'); this.cancelEdit(); this.render();
  }

  saveQuickTx() {
    const type   = g('q-type').value;
    const amount = parseFloat(g('q-amount').value)||0;
    const title  = g('q-title').value.trim();
    const date   = g('q-date').value;
    const cat    = g('q-cat').value;
    const accId  = g('q-acc').value;
    if (!amount||!title||!date||!accId) { this.toast('সব ঘর পূরণ করুন!','error'); return; }
    this.data.transactions.push({id:this.uid(),type,title,amount,date,accountId:accId,category:cat,notes:'',tags:[],recurring:false});
    this.save('transactions'); this.closeModal('m-quick'); this.toast('যোগ হয়েছে!','success');
    g('q-amount').value=''; g('q-title').value=''; this.render();
  }

  editTx(id) {
    const t = this.data.transactions.find(tx=>tx.id===id); if(!t) return;
    this.navigate('transactions');
    setTimeout(()=>{
      g('f-id').value=t.id; g('f-type').value=t.type; g('f-title').value=t.title; g('f-amount').value=t.amount; g('f-date').value=t.date; g('f-notes').value=t.notes||''; g('f-rec').checked=t.recurring||false;
      if(t.recurring){g('f-rec-freq').style.display='';g('f-rec-freq').value=t.recFreq||'monthly';}
      this.tags=t.tags||[]; this.renderTags(); g('f-tags').value=this.tags.join(',');
      this.fillCat('f-cat',t.type); this.fillAcc('f-acc'); this.fillAcc('f-to-acc');
      g('f-acc').value=t.accountId; g('f-cat').value=t.category;
      if(t.toAccountId) g('f-to-acc').value=t.toAccountId;
      document.querySelectorAll('[data-type]').forEach(b=>b.classList.toggle('active',b.dataset.type===t.type));
      g('f-to-g').style.display=t.type==='transfer'?'':'none'; g('f-cat-g').style.display=t.type==='transfer'?'none':'';
      setText('form-title','লেনদেন সম্পাদনা'); g('f-submit').textContent='✓ আপডেট করুন'; g('f-cancel').style.display='';
      g('f-submit').style.background='linear-gradient(135deg,#059669,#0d9488)';
    },100);
  }

  deleteTx(id) {
    if(!confirm('এই লেনদেন মুছবেন?')) return;
    this.data.transactions=this.data.transactions.filter(t=>t.id!==id);
    this.save('transactions'); this.toast('মুছে গেছে।','info'); this.render();
  }

  cancelEdit() {
    g('f-id').value=''; g('tx-form').reset(); g('f-date').value=new Date().toISOString().split('T')[0];
    this.tags=[]; this.renderTags(); g('f-tags').value='';
    setText('form-title','নতুন লেনদেন'); g('f-submit').textContent='লেনদেন যোগ করুন'; g('f-submit').style.background=''; g('f-cancel').style.display='none';
    g('f-rec-freq').style.display='none'; g('f-to-g').style.display='none'; g('f-cat-g').style.display='';
    document.querySelectorAll('[data-type]').forEach(b=>b.classList.toggle('active',b.dataset.type==='expense'));
    g('f-type').value='expense'; this.fillCat('f-cat','expense');
  }

  // ── ACCOUNTS ──────────────────────────────────────────────────
  openAccModal(id=null) {
    g('acc-id').value=id||''; setText('acc-modal-title',id?'একাউন্ট সম্পাদনা':'নতুন একাউন্ট'); g('acc-del-btn').style.display=id?'':'none';
    if(id){ const a=this.getAcc(id); if(a){g('acc-name').value=a.name;g('acc-type').value=a.type;g('acc-bal').value=a.balance;g('acc-clr').value=a.color;document.querySelectorAll('.clr-opt').forEach(c=>{c.classList.toggle('sel',c.dataset.clr===a.color)});} }
    else { g('acc-name').value='';g('acc-type').value='cash';g('acc-bal').value='0'; }
    this.openModal('m-acc');
  }

  saveAccount() {
    const id  =g('acc-id').value; const name=g('acc-name').value.trim(); const type=g('acc-type').value;
    const bal =parseFloat(g('acc-bal').value)||0; const color=g('acc-clr').value;
    if(!name){this.toast('একাউন্টের নাম দিন।','error');return;}
    if(id){this.data.accounts=this.data.accounts.map(a=>a.id===id?{...a,name,type,balance:bal,color}:a);this.toast('আপডেট হয়েছে!','success');}
    else{this.data.accounts.push({id:this.uid(),name,type,balance:bal,color});this.toast('একাউন্ট তৈরি হয়েছে!','success');}
    this.save('accounts'); this.closeModal('m-acc'); this.refreshAccSelects(); this.render();
  }

  deleteAccount() {
    const id=g('acc-id').value; if(!id||!confirm('একাউন্ট মুছবেন?')) return;
    this.data.accounts=this.data.accounts.filter(a=>a.id!==id); this.save('accounts'); this.closeModal('m-acc'); this.refreshAccSelects(); this.toast('মুছে গেছে।','info'); this.render();
  }

  refreshAccSelects() { ['f-acc','f-to-acc','q-acc'].forEach(id=>this.fillAcc(id)); }

  openMessMemberModal() {
    g('mm-id').value=''; g('mm-name').value='';
    this.openModal('m-mess-member');
  }

  saveMessMember() {
    const id=g('mm-id').value; const name=g('mm-name').value.trim(); if(!name){this.toast('নাম দিন।','error');return;}
    if(this.data.mess.members.some(m=>m.name===name && m.id!==id)){this.toast('এই নাম আগে থেকেই আছে।','error');return;}
    if(id){
      this.data.mess.members=this.data.mess.members.map(m=>m.id===id?{...m,name}:m);
      this.toast('সদস্য আপডেট হয়েছে!','success');
    }else{
      this.data.mess.members.push({id:this.uid(),name});
      this.toast(`${name} যোগ হয়েছে!`,'success');
    }
    this.save('mess'); this.closeModal('m-mess-member'); g('mm-name').value=''; g('mm-id').value=''; this.fillMessPayer(); this.render();
  }

  editMessMember(id) {
    const m=this.data.mess.members.find(m=>m.id===id); if(!m) return;
    g('mm-id').value=id; g('mm-name').value=m.name;
    this.openModal('m-mess-member');
  }

  deleteMessMember(id) {
    const m=this.data.mess.members.find(m=>m.id===id); if(!m) return;
    if(!confirm(`${m.name}-কে মেস থেকে বাদ দিতে চান?`)) return;
    this.data.mess.members=this.data.mess.members.filter(m=>m.id!==id);
    this.save('mess'); this.fillMessPayer(); this.toast('সদস্য বাদ দেওয়া হয়েছে।','info'); this.render();
  }

  toggleMessEntryType(type) {
    g('me-type').value=type;
    document.querySelectorAll('[data-metype]').forEach(b=>b.classList.toggle('active',b.dataset.metype===type));
    this.fillMessPayer();
    if(type==='deposit'){
      g('me-title-lbl').textContent='বিবরণ (ঐচ্ছিক)';
      g('me-title').placeholder='যেমন: তহবিলে জমা';
      g('me-cat-g').style.display='none';
      g('me-amount-g').style.display='none';
      g('me-payer-g').style.display='none';
      g('me-deposit-grid-g').style.display='';
      
      // Populate deposit list
      const dl=g('me-deposit-list');
      dl.innerHTML=this.data.mess.members.map(m=>`
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <span style="font-size:13px;font-weight:700;color:var(--head);font-family:'Hind Siliguri',sans-serif">${m.name}</span>
          <input type="number" class="inp dep-member-inp" data-mid="${m.id}" placeholder="০" style="width:100px;text-align:right" min="0" step="1">
        </div>
      `).join('');
    }else{
      g('me-title-lbl').textContent='বিবরণ';
      g('me-title').placeholder='যেমন: বাজার, গ্যাস বিল';
      g('me-cat-g').style.display='';
      g('me-amount-g').style.display='';
      g('me-payer-g').style.display='';
      g('me-deposit-grid-g').style.display='none';
    }
  }

  fillMessPayer() {
    const el=g('me-payer'); if(!el) return;
    const type=g('me-type')?.value||'expense';
    if(type==='deposit'){
      el.innerHTML=this.data.mess.members.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
    }else{
      el.innerHTML='<option value="mess-fund">📦 মেস তহবিল (সবার খরচ)</option>'+this.data.mess.members.map(m=>`<option value="${m.id}">${m.name} (ব্যক্তিগত খরচ)</option>`).join('');
    }
  }

  openMessEntry(id=null) {
    g('me-id').value=id||''; setText('mess-entry-title',id?'মেস খরচ/জমা সম্পাদনা':'মেস খরচ/জমা যোগ'); g('me-del-btn').style.display=id?'':'none';
    if(id){
      const e=this.data.mess.entries.find(e=>e.id===id);
      if(e){
        this.toggleMessEntryType(e.type||'expense');
        g('me-title').value=e.title;
        g('me-date').value=e.date;
        if(e.type==='deposit'){
          const inp=document.querySelector(`.dep-member-inp[data-mid="${e.payerId}"]`);
          if(inp) inp.value=e.amount;
        }else{
          g('me-amount').value=e.amount;
          g('me-payer').value=e.payerId;
          const resolvedCat = this.resolveLegacyCat(e.category)||'অন্যান্য';
          g('me-cat').value=resolvedCat;
          this.updateSubcatDropdown(resolvedCat, e.subcategory||'');
        }
      }
    }
    else {
      this.toggleMessEntryType('expense');
      g('me-title').value='';
      g('me-amount').value='';
      g('me-date').value=new Date().toISOString().split('T')[0];
      this.updateSubcatDropdown(g('me-cat').value, '');
    }
    this.openModal('m-mess-entry');
  }

  saveMessEntry() {
    const id     =g('me-id').value;
    const type   =g('me-type').value;
    let title    =g('me-title').value.trim();
    const date   =g('me-date').value;
    
    if(type==='deposit'&&!title) title='তহবিলে জমা';
    if(!date){this.toast('তারিখ দিন।','error');return;}
    
    if(type==='deposit'){
      const inputs=document.querySelectorAll('.dep-member-inp');
      const activeInputs=Array.from(inputs).map(inp=>({
        mid:inp.dataset.mid,
        amt:parseFloat(inp.value)||0
      })).filter(x=>x.amt>0);
      
      if(!activeInputs.length){
        this.toast('কমপক্ষে একজনের জমার পরিমাণ লিখুন।','error');
        return;
      }
      
      if(id){
        // Editing: Update the existing deposit entry with first input, and create new ones for others
        const e=this.data.mess.entries.find(entry=>entry.id===id);
        if(e){
          const first=activeInputs[0];
          e.payerId=first.mid;
          e.amount=first.amt;
          e.date=date;
          e.title=title;
          
          // Create new ones for the rest
          for(let i=1;i<activeInputs.length;i++){
            this.data.mess.entries.push({
              id:this.uid(),
              type:'deposit',
              title,
              amount:activeInputs[i].amt,
              date,
              payerId:activeInputs[i].mid,
              category:'জমা'
            });
          }
        }
      }else{
        // Creating: Create entries for all members with >0 amounts
        activeInputs.forEach(x=>{
          this.data.mess.entries.push({
            id:this.uid(),
            type:'deposit',
            title,
            amount:x.amt,
            date,
            payerId:x.mid,
            category:'জমা'
          });
        });
      }
      this.toast('জমা সফলভাবে সংরক্ষিত হয়েছে!','success');
    }else{
      const amount =parseFloat(g('me-amount').value)||0;
      const payerId=g('me-payer').value;
      const cat    =g('me-cat').value;
      const subcat =g('me-subcat')?.value || '';
      if(!title||!amount||!payerId){this.toast('সব ঘর পূরণ করুন।','error');return;}
      const entry={id:id||this.uid(),type:'expense',title,amount,date,payerId,category:cat,subcategory:subcat};
      if(id){
        this.data.mess.entries=this.data.mess.entries.map(e=>e.id===id?entry:e);
        this.toast('আপডেট হয়েছে!','success');
      }else{
        this.data.mess.entries.push(entry);
        this.toast('মেস খরচ যোগ হয়েছে!','success');
      }
    }
    this.save('mess'); this.closeModal('m-mess-entry'); this.render();
  }

  deleteMessEntry() {
    const id=g('me-id').value; if(!id||!confirm('এই এন্ট্রি মুছবেন?')) return;
    this.data.mess.entries=this.data.mess.entries.filter(e=>e.id!==id); this.save('mess'); this.closeModal('m-mess-entry'); this.toast('মুছে গেছে।','info'); this.render();
  }

  // ── BAZAR ─────────────────────────────────────────────────────
  bindBazar() {
    g('bz-add-btn')?.addEventListener('click', () => this.addBazarItem());
    g('clear-done-btn')?.addEventListener('click', () => {
      this.data.bazar=this.data.bazar.filter(b=>!b.done); this.save('bazar'); this.render(); this.toast('সম্পন্ন আইটেম মুছে গেছে।','info');
    });
    document.querySelectorAll('.prio-btn').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.prio-btn').forEach(bb=>{bb.classList.remove('active','btn-d','btn-s');bb.classList.add('btn-s');});
        b.classList.remove('btn-s'); b.classList.add('active','btn-d'); g('bz-prio').value=b.dataset.prio;
      });
    });
    document.querySelectorAll('[data-bfilter]').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('[data-bfilter]').forEach(tt=>tt.classList.remove('active')); t.classList.add('active');
        this.renderBazar(t.dataset.bfilter);
      });
    });
  }

  addBazarItem() {
    const name=g('bz-name').value.trim(); const qty=g('bz-qty').value.trim(); const prio=g('bz-prio').value;
    if(!name){this.toast('পণ্যের নাম দিন।','error');return;}
    this.data.bazar.push({id:this.uid(),name,qty,price:0,prio,done:false,addedAt:new Date().toISOString()});
    this.save('bazar'); g('bz-name').value=''; g('bz-qty').value=''; this.toast(`${name} যোগ হয়েছে!`,'success'); this.renderBazar();
  }

  toggleBazar(id) {
    this.data.bazar=this.data.bazar.map(b=>b.id===id?{...b,done:!b.done}:b); this.save('bazar'); this.renderBazar();
  }

  openBazarEdit(id) {
    const item=this.data.bazar.find(b=>b.id===id); if(!item) return;
    g('baz-id').value=id; g('baz-name').value=item.name; g('baz-qty').value=item.qty||'';
    this.openModal('m-bazar');
  }

  saveBazarEdit() {
    const id=g('baz-id').value; if(!id) return;
    const name=g('baz-name').value.trim(); const qty=g('baz-qty').value.trim();
    this.data.bazar=this.data.bazar.map(b=>b.id===id?{...b,name,qty,price:0}:b);
    this.save('bazar'); this.closeModal('m-bazar'); this.toast('আপডেট হয়েছে!','success'); this.renderBazar();
  }

  deleteBazarItem(id) {
    if(!id||!confirm('এই আইটেম মুছবেন?')) return;
    this.data.bazar=this.data.bazar.filter(b=>b.id!==id); this.save('bazar'); this.closeModal('m-bazar'); this.toast('মুছে গেছে।','info'); this.renderBazar();
  }

  // ── BUDGET ────────────────────────────────────────────────────
  saveBudget() {
    const cat=g('b-cat').value; const limit=parseFloat(g('b-limit').value)||0;
    if(!cat||!limit){this.toast('সব ঘর পূরণ করুন।','error');return;}
    this.data.budgets[cat]=limit; this.save('budgets'); this.closeModal('m-budget'); this.toast(`${cat}-এর বাজেট সেট হয়েছে!`,'success'); this.render();
  }

  deleteBudget(cat) {
    if(!confirm(`${cat}-এর বাজেট মুছবেন?`)) return;
    delete this.data.budgets[cat]; this.save('budgets'); this.toast('মুছে গেছে।','info'); this.render();
  }

  // ── GOALS ─────────────────────────────────────────────────────
  openGoalModal(id=null) {
    g('g-id').value=id||''; setText('goal-modal-title',id?'লক্ষ্য সম্পাদনা':'নতুন লক্ষ্য'); g('g-del-btn').style.display=id?'':'none';
    if(id){const go=this.data.goals.find(g=>g.id===id);if(go){document.getElementById('g-name').value=go.name;document.getElementById('g-target').value=go.target;document.getElementById('g-saved').value=go.saved;document.getElementById('g-icon').value=go.icon||'🎯';document.getElementById('g-deadline').value=go.deadline||'';}}
    else{['g-name','g-target','g-saved','g-deadline'].forEach(i=>{const el=g(i);if(el)el.value='';});document.getElementById('g-icon').value='🎯';}
    this.openModal('m-goal');
  }

  saveGoal() {
    const id=g('g-id').value; const name=g('g-name').value.trim(); const target=parseFloat(g('g-target').value)||0;
    const saved=parseFloat(g('g-saved').value)||0; const deadline=g('g-deadline').value; const icon=g('g-icon').value||'🎯';
    if(!name||!target){this.toast('সব ঘর পূরণ করুন।','error');return;}
    const goal={id:id||this.uid(),name,target,saved,deadline,icon,history:[]};
    if(id){this.data.goals=this.data.goals.map(gg=>gg.id===id?{...gg,name,target,saved,deadline,icon}:gg);this.toast('আপডেট হয়েছে!','success');}
    else{this.data.goals.push(goal);this.toast('লক্ষ্য তৈরি হয়েছে!','success');}
    this.save('goals'); this.closeModal('m-goal'); this.render();
  }

  deleteGoal() {
    const id=g('g-id').value; if(!id||!confirm('এই লক্ষ্য মুছবেন?')) return;
    this.data.goals=this.data.goals.filter(gg=>gg.id!==id); this.save('goals'); this.closeModal('m-goal'); this.toast('মুছে গেছে।','info'); this.render();
  }

  openContrib(goalId) {
    g('c-goal-id').value=goalId; const go=this.data.goals.find(gg=>gg.id===goalId);
    setText('contrib-title',go?`${go.icon} ${go.name}`:'সঞ্চয়'); g('c-amount').value='';
    g('c-type').value='add'; document.querySelectorAll('[data-ctype]').forEach(b=>b.classList.toggle('active',b.dataset.ctype==='add'));
    this.openModal('m-contrib');
  }

  contributeGoal() {
    const goalId=g('c-goal-id').value; const type=g('c-type').value; const amount=parseFloat(g('c-amount').value)||0;
    if(!amount){this.toast('পরিমাণ দিন।','error');return;}
    this.data.goals=this.data.goals.map(gg=>{if(gg.id!==goalId)return gg;const ns=type==='add'?gg.saved+amount:Math.max(0,gg.saved-amount);return{...gg,saved:ns,history:[...(gg.history||[]),{date:new Date().toISOString().split('T')[0],type,amount}]};});
    this.save('goals'); this.closeModal('m-contrib'); this.toast(type==='add'?`${this.fmt(amount)} যোগ হয়েছে!`:`${this.fmt(amount)} তোলা হয়েছে।`,'success'); this.render();
  }

  // ── DEBTS ─────────────────────────────────────────────────────
  openDebtModal(id=null) {
    g('d-id').value=id||''; setText('debt-modal-title',id?'ধার সম্পাদনা':'নতুন ধার রেকর্ড'); g('d-del-btn').style.display=id?'':'none';
    if(id){const d=this.data.debts.find(d=>d.id===id);if(d){g('d-person').value=d.person;g('d-amount').value=d.amount;g('d-due').value=d.due||'';g('d-desc').value=d.desc||'';g('d-type').value=d.type;document.querySelectorAll('[data-dtype]').forEach(b=>b.classList.toggle('active',b.dataset.dtype===d.type));}}
    else{['d-person','d-amount','d-due','d-desc'].forEach(i=>{const el=g(i);if(el)el.value='';});g('d-type').value='i-owe';document.querySelectorAll('[data-dtype]').forEach(b=>b.classList.toggle('active',b.dataset.dtype==='i-owe'));}
    this.openModal('m-debt');
  }

  saveDebt() {
    const id=g('d-id').value; const type=g('d-type').value; const person=g('d-person').value.trim(); const amount=parseFloat(g('d-amount').value)||0;
    const due=g('d-due').value; const desc=g('d-desc').value.trim();
    if(!person||!amount){this.toast('সব ঘর পূরণ করুন।','error');return;}
    const debt={id:id||this.uid(),type,person,amount,due,desc,settled:false};
    if(id){this.data.debts=this.data.debts.map(d=>d.id===id?{...d,type,person,amount,due,desc}:d);this.toast('আপডেট হয়েছে!','success');}
    else{this.data.debts.push(debt);this.toast('ধার রেকর্ড হয়েছে!','success');}
    this.save('debts'); this.closeModal('m-debt'); this.render();
  }

  deleteDebt() {
    const id=g('d-id').value; if(!id||!confirm('এই ধার রেকর্ড মুছবেন?')) return;
    this.data.debts=this.data.debts.filter(d=>d.id!==id); this.save('debts'); this.closeModal('m-debt'); this.toast('মুছে গেছে।','info'); this.render();
  }

  settleDebt(id) {
    this.data.debts=this.data.debts.map(d=>d.id===id?{...d,settled:true}:d); this.save('debts'); this.toast('পরিশোধ সম্পন্ন! ✓','success'); this.render();
  }

  // ── SPLITS ────────────────────────────────────────────────────
  openSplitModal(id=null) {
    this.spMembers=[]; this.renderSpMembers(); g('sp-amount').value=''; g('sp-title').value=''; g('sp-date').value=new Date().toISOString().split('T')[0];
    if(g('sp-result-wrap')) g('sp-result-wrap').style.display='none';
    this.openModal('m-split');
  }

  saveSplit() {
    const title=g('sp-title').value.trim(); const amount=parseFloat(g('sp-amount').value)||0; const date=g('sp-date').value; const members=this.spMembers.slice();
    if(!title||!amount||!members.length){this.toast('বিবরণ, পরিমাণ ও অংশগ্রহণকারী দিন।','error');return;}
    const perPerson=amount/members.length;
    const split={id:this.uid(),title,totalAmount:amount,date,members:members.map(m=>({name:m,amount:perPerson,paid:false})),settled:false};
    this.data.splits.push(split); this.save('splits'); this.closeModal('m-split'); this.toast('ভাগ তৈরি হয়েছে!','success'); this.render();
  }

  settleSplit(id) {
    this.data.splits=this.data.splits.map(s=>s.id===id?{...s,settled:true}:s); this.save('splits'); this.toast('পরিশোধ সম্পন্ন!','success'); this.render();
  }

  deleteSplit(id) {
    if(!confirm('এই ভাগ মুছবেন?')) return;
    this.data.splits=this.data.splits.filter(s=>s.id!==id); this.save('splits'); this.toast('মুছে গেছে।','info'); this.render();
  }

  // ── RECURRING ─────────────────────────────────────────────────
  processRecurring() {
    const today=new Date(); const todayStr=today.toISOString().split('T')[0];
    if(localStorage.getItem('bk_last_rec')===todayStr) return;
    let added=0;
    this.data.transactions.filter(t=>t.recurring&&t.recFreq).forEach(t=>{
      const ld=new Date(t.date); let nd=new Date(ld);
      if(t.recFreq==='monthly')nd.setMonth(nd.getMonth()+1);
      else if(t.recFreq==='weekly')nd.setDate(nd.getDate()+7);
      else if(t.recFreq==='yearly')nd.setFullYear(nd.getFullYear()+1);
      if(nd<=today){this.data.transactions.push({...t,id:this.uid(),date:nd.toISOString().split('T')[0]});added++;}
    });
    if(added){this.save('transactions');this.toast(`${added}টি পুনরাবৃত্তি লেনদেন প্রক্রিয়া হয়েছে।`,'info');}
    localStorage.setItem('bk_last_rec',todayStr);
  }

  // ── RENDER: DASHBOARD ─────────────────────────────────────────
  renderDash() {
    const mTx=this.txForMonth();
    const income=mTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const expense=mTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    setText('d-balance',this.fmt(this.totalBal()));
    setText('d-income',this.fmt(income));
    setText('d-expense',this.fmt(expense));
    setText('d-acc-total',this.fmtK(this.totalBal()));
    setText('d-acc-count', this.lang === 'bn' ? `${this.data.accounts.length}টি` : `${this.data.accounts.length} wallets`);

    // Mess stats (only include shared mess expenses)
    const messExpenses = this.data.mess.entries.filter(e => {
      const d = new Date(e.date);
      return e.type === 'expense' && e.payerId === 'mess-fund' && d.getUTCMonth() === this.month && d.getUTCFullYear() === this.year;
    });
    const messTotal = messExpenses.reduce((s,e) => s+e.amount, 0);
    const memberCount = this.data.mess.members.length;
    setText('d-mess-total', this.fmt(messTotal));
    setText('d-mess-pp', memberCount > 0 ? `${this.t('per_head')} ${this.fmt(messTotal/memberCount)}` : this.t('add_member_lbl'));

    // Debts
    const activeDebts=this.data.debts.filter(d=>!d.settled);
    setText('d-debt-total',this.fmtK(activeDebts.reduce((s,d)=>s+d.amount,0)));
    setText('d-debt-count', this.lang === 'bn' ? `${activeDebts.length}টি` : `${activeDebts.length} active`);

    const monthsBN=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
    const monthsEN=['January','February','March','April','May','June','July','August','September','October','November','December'];
    const months = this.lang === 'bn' ? monthsBN : monthsEN;
    setText('d-chart-sub',`${months[this.month]} ${this.year}`);

    this.renderCatChart(mTx);
    this.renderTrendChart();
    this.renderHealthScore(income,expense);
    this.renderInsights(mTx,income,expense);
    this.renderRecent();
    this.responsiveChartGrid();
  }

  responsiveChartGrid() {
    const el=g('dash-charts'); if(!el) return;
    if(window.innerWidth<=900) el.style.gridTemplateColumns='1fr';
    else el.style.gridTemplateColumns='1fr 1fr 290px';
  }

  catEmoji(cat) {
    const m={'মেস':'🏢','খাবার':'🍛','বাজার':'🛒','রুম ভাড়া':'🏠','বিদ্যুৎ বিল':'💡','মোবাইল রিচার্জ':'📱','ইন্টারনেট':'📶','যাতায়াত':'🚗','পড়াশোনা':'📚','বই/ফটোকপি':'📑','ওষুধ':'💊','পোশাক':'👔','বিনোদন':'🎮','লন্ড্রি':'👕','সেলুন':'✂️','চা/নাস্তা':'☕','রেস্তোরাঁ':'🍽️','অন্যান্য':'📂','বেতন/বৃত্তি':'💰','ফ্রিল্যান্স':'💻','পার্টটাইম':'⏰','পারিবারিক':'👨‍👩‍👦','বোনাস':'🎁','অন্যান্য আয়':'💵','ট্রান্সফার':'⇄','Transfer':'⇄'};
    return m[cat]||'📂';
  }

  renderCatChart(mTx) {
    const cats={}; mTx.filter(t=>t.type==='expense').forEach(t=>{const translatedCat=this.tCat(t.category);cats[translatedCat]=(cats[translatedCat]||0)+t.amount;});
    const labels=Object.keys(cats); const data=Object.values(cats);
    const COLORS=['#f97316','#f43f5e','#10b981','#f59e0b','#3b82f6','#a855f7','#06b6d4','#ec4899','#14b8a6','#ef4444'];
    if(this.charts.cat)this.charts.cat.destroy();
    const ctx=g('cat-chart'); if(!ctx) return;
    const muted=getMuted();
    requestAnimationFrame(() => {
      if(!labels.length){this.charts.cat=new Chart(ctx,{type:'doughnut',data:{labels:[this.t('no_tx')],datasets:[{data:[1],backgroundColor:['rgba(255,255,255,.05)'],borderColor:'transparent',borderWidth:0}]},options:{cutout:'78%',plugins:{legend:{display:false},tooltip:{enabled:false}}}});return;}
      this.charts.cat=new Chart(ctx,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:COLORS,borderColor:'transparent',borderWidth:0,hoverOffset:6}]},options:{cutout:'78%',responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'},padding:8,usePointStyle:true}},tooltip:{callbacks:{label:c=>`${c.label}: ${this.fmt(c.parsed)}`}}}}});
    });
  }

  renderTrendChart() {
    if(this.charts.trend)this.charts.trend.destroy();
    const ctx=g('trend-chart'); if(!ctx) return;
    const empty=g('trend-empty');
    
    if (this.data.transactions.length === 0) {
      ctx.style.display = 'none';
      if(empty) empty.style.display = 'flex';
      return;
    }
    ctx.style.display = '';
    if(empty) empty.style.display = 'none';

    const now=new Date(); const labels=[], incomes=[], expenses=[];
    const mBn=['জান','ফেব','মার্চ','এপ্রি','মে','জুন','জুল','আগ','সেপ','অক্টো','নভে','ডিসে'];
    const mEn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mActive = this.lang === 'bn' ? mBn : mEn;
    for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);labels.push(mActive[d.getMonth()]);const tx=this.txForMonth(d.getMonth(),d.getFullYear());incomes.push(tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));expenses.push(tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));}
    const muted=getMuted();
    requestAnimationFrame(() => {
      this.charts.trend=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:this.t('income_lbl'),data:incomes,borderColor:'#10b981',backgroundColor:'rgba(16,185,129,.07)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#10b981',borderWidth:2},{label:this.t('expense_lbl'),data:expenses,borderColor:'#f43f5e',backgroundColor:'rgba(244,63,94,.07)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#f43f5e',borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'},usePointStyle:true}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${this.fmt(c.parsed.y)}`}}},scales:{x:{grid:{color:'rgba(255,255,255,.03)'},ticks:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'}}},y:{grid:{color:'rgba(255,255,255,.03)'},ticks:{color:muted,font:{size:9,family:'Hind Siliguri'},callback:v=>this.fmtK(v)}}}}});
    });
  }

  renderHealthScore(income,expense) {
    const ctx=g('health-chart'); if(!ctx) return;
    if(this.charts.health)this.charts.health.destroy();

    if (this.data.transactions.length === 0) {
      setText('health-score', '--');
      setText('health-label', this.t('no_data'));
      g('health-tips').innerHTML = `<div style="font-size:10px;text-align:center;color:var(--muted);font-family:'Hind Siliguri',sans-serif;width:100%;margin-top:10px">${this.t('health_tips_empty')}</div>`;
      requestAnimationFrame(() => {
        this.charts.health=new Chart(ctx,{type:'doughnut',data:{datasets:[{data:[0,100],backgroundColor:['transparent','rgba(255,255,255,.05)'],borderColor:'transparent',borderWidth:0,cutout:'78%'}]},options:{responsive:false,plugins:{legend:{display:false},tooltip:{enabled:false}},rotation:-90,circumference:180}});
      });
      return;
    }

    let score=0;
    const sr=income>0?(income-expense)/income:0; score+=Math.min(40,Math.round(sr*40));
    let bs=30; Object.entries(this.data.budgets).forEach(([cat,lim])=>{const sp=this.txForMonth().filter(t=>t.type==='expense'&&t.category===cat).reduce((s,t)=>s+t.amount,0);if(sp>lim)bs-=8;}); score+=Math.max(0,bs);
    if(this.data.goals.length>0)score+=10; const tgs=this.data.goals.reduce((s,g)=>s+g.saved,0);const tgt=this.data.goals.reduce((s,g)=>s+g.target,0);if(tgt>0&&tgs/tgt>0.5)score+=5;
    const hasOD=this.data.debts.filter(d=>!d.settled&&d.due&&new Date(d.due)<new Date()).length>0; if(!hasOD)score+=15;
    score=Math.min(100,Math.max(0,score));
    let label=this.t('score_poor');let color='#f43f5e';
    if(score>=80){label=this.t('score_excellent');color='#10b981';}else if(score>=60){label=this.t('score_good');color='#3b82f6';}else if(score>=40){label=this.t('score_average');color='#f59e0b';}
    setText('health-score',score); setText('health-label',label);
    requestAnimationFrame(() => {
      this.charts.health=new Chart(ctx,{type:'doughnut',data:{datasets:[{data:[score,100-score],backgroundColor:[color,'rgba(255,255,255,.05)'],borderColor:'transparent',borderWidth:0,cutout:'78%'}]},options:{responsive:false,plugins:{legend:{display:false},tooltip:{enabled:false}},rotation:-90,circumference:180}});
    });
    const tips=[];
    if(sr<0.15)tips.push({t:this.t('tip_save'),e:'💡'});
    if(this.data.goals.length===0)tips.push({t:this.t('tip_goal'),e:'🎯'});
    if(hasOD)tips.push({t:this.t('tip_debt'),e:'⚠️'});
    if(score>=80)tips.push({t:this.t('tip_great'),e:'🏆'});
    g('health-tips').innerHTML=tips.slice(0,2).map(t=>`<div style="display:flex;align-items:center;gap:7px;padding:6px 9px;border-radius:9px;background:var(--surface);font-size:10px;color:var(--text);font-family:'Hind Siliguri',sans-serif"><span>${t.e}</span><span>${t.t}</span></div>`).join('');
  }

  renderInsights(mTx,income,expense) {
    if (this.data.transactions.length === 0) {
      g('insights-list').innerHTML = `<div class="ins" style="justify-content:center;text-align:center;padding:18px 12px"><div style="font-size:12px;font-family:'Hind Siliguri',sans-serif;color:var(--muted)">${this.t('insights_empty')}</div></div>`;
      return;
    }

    const insights=[];
    const today=new Date(); const dim=new Date(today.getFullYear(),today.getMonth()+1,0).getDate(); const dp=today.getDate(); const rem=dim-dp;
    const daily=dp>0?expense/dp:0; const pred=this.totalBal()-daily*rem;
    insights.push({e:'🔮',t:`${this.t('est_balance')}: <b>${this.fmt(pred)}</b>`});
    const spDays=new Set(mTx.filter(t=>t.type==='expense').map(t=>t.date)).size;
    insights.push({e:'✨',t:this.lang === 'bn' ? `এই মাসে <b>${dp-spDays}টি</b> খরচমুক্ত দিন` : `<b>${dp-spDays}</b> spend-free days this month`});
    const catT={}; mTx.filter(t=>t.type==='expense').forEach(t=>{catT[t.category]=(catT[t.category]||0)+t.amount;});
    const tc=Object.entries(catT).sort((a,b)=>b[1]-a[1])[0];
    if(tc)insights.push({e:'📊',t:`${this.t('top_expense')}: <b>${this.tCat(tc[0])}</b> — ${this.fmt(tc[1])}`});
    if(income>0){const rate=Math.round(((income-expense)/income)*100);insights.push({e:rate>20?'🎉':rate>0?'👍':'⚠️',t:`${this.t('savings_rate')}: <b>${rate}%</b>`});}
    const mb=[];Object.entries(this.data.budgets).forEach(([cat,lim])=>{const sp=mTx.filter(t=>t.type==='expense'&&t.category===cat).reduce((s,t)=>s+t.amount,0);if(sp>lim*0.8)mb.push(cat);});
    if(mb.length)insights.push({e:'🚨',t:`${this.t('budget_alert')}: ${mb.map(c=>this.tCat(c)).join(', ')}`});

    // Bachelor-specific insights
    const messTotal=this.data.mess.entries.filter(e=>{const d=new Date(e.date);return d.getUTCMonth()===this.month&&d.getUTCFullYear()===this.year;}).reduce((s,e)=>s+e.amount,0);
    if(messTotal>0&&income>0&&messTotal/income>0.5)insights.push({e:'🍛',t:this.t('mess_warn_50')});

    g('insights-list').innerHTML=insights.slice(0,5).map(ins=>`<div class="ins"><div class="ins-ico" style="background:var(--p-light);font-size:16px">${ins.e}</div><span style="font-size:11px;font-family:'Hind Siliguri',sans-serif">${ins.t}</span></div>`).join('');
  }

  renderRecent() {
    const recent=[...this.data.transactions].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);
    if(!recent.length){g('recent-list').innerHTML=`<div class="empty"><i class="fas fa-receipt"></i><p>${this.t('no_tx')}</p></div>`;return;}
    g('recent-list').innerHTML=recent.map(t=>{
      const acc=this.getAcc(t.accountId); const isInc=t.type==='income'; const isTr=t.type==='transfer';
      const color=isInc?'var(--green)':isTr?'var(--blue)':'var(--red)'; const sign=isInc?'+':isTr?'⇄':'-';
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)"><div style="width:34px;height:34px;border-radius:9px;background:${color}1a;border:1px solid ${color}33;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${this.catEmoji(t.category)}</div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;color:var(--head);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'Hind Siliguri',sans-serif">${t.title}</div><div style="font-size:10px;color:var(--muted)">${this.tCat(t.category)} · ${t.date}</div></div><div style="font-size:13px;font-weight:800;color:${color};white-space:nowrap">${sign}${this.fmt(t.amount)}</div></div>`;
    }).join('');
  }

  // ── RENDER: TRANSACTIONS ──────────────────────────────────────
  renderTx() {
    this.fillAcc('f-acc'); this.fillAcc('f-to-acc');
    const fc=g('t-cat'); if(fc){const all=[...this.INCOME_CATS,...this.EXPENSE_CATS];fc.innerHTML=`<option value="all">${this.t('all_cats')}</option>`+all.map(c=>`<option value="${c}">${this.tCat(c)}</option>`).join('');}
    this.applyTxFilter();
  }

  bindFilters() {
    ['t-search','t-type','t-cat'].forEach(id=>{g(id)?.addEventListener('input',()=>this.applyTxFilter());g(id)?.addEventListener('change',()=>this.applyTxFilter());});
  }

  applyTxFilter() {
    const search=(g('t-search')?.value||'').toLowerCase(); const fType=g('t-type')?.value||'all'; const fCat=g('t-cat')?.value||'all';
    let tx=this.data.transactions.filter(t=>{
      const d=new Date(t.date); const mm=d.getUTCMonth()===this.month&&d.getUTCFullYear()===this.year;
      const ms=!search||t.title.toLowerCase().includes(search)||(t.notes||'').toLowerCase().includes(search)||(t.tags||[]).some(tag=>tag.includes(search));
      return mm&&ms&&(fType==='all'||t.type===fType)&&(fCat==='all'||t.category===fCat);
    }).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const tbody=g('tx-list'); const empty=g('tx-empty'); if(!tbody) return;
    if(!tx.length){tbody.innerHTML='';empty.style.display='';}
    else{
      empty.style.display='none';
      tbody.innerHTML=tx.map(t=>{
        const acc=this.getAcc(t.accountId); const isInc=t.type==='income'; const isTr=t.type==='transfer';
        const color=isInc?'var(--green)':isTr?'var(--blue)':'var(--red)'; const sign=isInc?'+':isTr?'⇄':'-';
        const tags=(t.tags||[]).map(tag=>`<span style="display:inline-flex;background:var(--p-light);border:1px solid rgba(249,115,22,.2);color:var(--p);border-radius:99px;padding:1px 6px;font-size:8px;font-weight:700">#${tag}</span>`).join(' ');
        return `<tr class="${isTr?'tr-row':''}">
          <td style="white-space:nowrap;font-size:10px;color:var(--muted);font-weight:600">${t.date}</td>
          <td><div style="font-size:12px;font-weight:700;color:var(--head);font-family:'Hind Siliguri',sans-serif">${t.title}</div>${t.notes?`<div style="font-size:10px;color:var(--muted)">${t.notes}</div>`:''}</td>
          <td><span style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:99px;font-size:9px;font-weight:700;background:var(--surface2);border:1px solid var(--border);color:var(--muted)">${this.catEmoji(t.category)} ${this.tCat(t.category)}</span></td>
          <td style="font-size:10px;color:var(--muted)">${acc?`${this.accIcon(acc.type)} ${this.tAccName(acc.name)}`:'-'}</td>
          <td style="text-align:right;font-size:12px;font-weight:800;color:${color};white-space:nowrap">${sign}${this.fmt(t.amount)}</td>
          <td style="text-align:center"><div style="display:flex;gap:3px;justify-content:center"><button onclick="app.editTx('${t.id}')" class="btn btn-s bsm bico" title="${this.t('edit')}"><i class="fas fa-pen" style="font-size:9px"></i></button><button onclick="app.deleteTx('${t.id}')" class="btn btn-d bsm bico" title="${this.t('delete')}"><i class="fas fa-trash" style="font-size:9px"></i></button></div></td>
        </tr>`;
      }).join('');
    }
    const ti=tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const to=tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    setText('tx-count', this.lang === 'bn' ? `${tx.length}টি রেকর্ড` : `${tx.length} records`); setText('tx-in',`+${this.fmt(ti)}`); setText('tx-out',`-${this.fmt(to)}`);
  }

  // ── RENDER: ACCOUNTS ──────────────────────────────────────────
  renderAccounts() {
    const grid=g('accounts-grid'); if(!grid) return;
    grid.innerHTML=this.data.accounts.map(acc=>{
      const bal=this.accBal(acc); const mTx=this.txForMonth().filter(t=>t.accountId===acc.id||t.toAccountId===acc.id);
      const mIn=mTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0); const mOut=mTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
      return `<div class="card acc-card ch" onclick="app.openAccModal('${acc.id}')" style="background:linear-gradient(135deg,${acc.color}18,${acc.color}06);border-color:${acc.color}28">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div style="width:42px;height:42px;border-radius:13px;background:${acc.color}22;border:1px solid ${acc.color}38;display:flex;align-items:center;justify-content:center;font-size:20px">${this.accIcon(acc.type)}</div><span class="badge" style="background:${acc.color}18;border-color:${acc.color}35;color:${acc.color};font-family:'Hind Siliguri',sans-serif">${this.t('acc_type_' + acc.type)}</span></div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:3px;font-family:'Hind Siliguri',sans-serif">${this.tAccName(acc.name)}</div>
        <div style="font-size:24px;font-weight:900;color:var(--head);letter-spacing:-.02em;font-family:'Hind Siliguri',sans-serif">${this.fmt(bal)}</div>
        <div style="display:flex;gap:14px;margin-top:10px;padding-top:10px;border-top:1px solid ${acc.color}18"><div><div style="font-size:8px;font-weight:800;text-transform:uppercase;color:var(--muted)">${this.t('income_lbl')}</div><div style="font-size:11px;font-weight:800;color:var(--green);font-family:'Hind Siliguri',sans-serif">+${this.fmtK(mIn)}</div></div><div><div style="font-size:8px;font-weight:800;text-transform:uppercase;color:var(--muted)">${this.t('expense_lbl')}</div><div style="font-size:11px;font-weight:800;color:var(--red);font-family:'Hind Siliguri',sans-serif">-${this.fmtK(mOut)}</div></div></div>
      </div>`;
    }).join('');
    if(!this.data.accounts.length)grid.innerHTML=`<div class="empty"><i class="fas fa-wallet"></i><p>${this.t('no_accounts')}</p></div>`;
  }

  // ── RENDER: MESS ──────────────────────────────────────────────
  renderMess() {
    const monthsBN=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
    const monthsEN=['January','February','March','April','May','June','July','August','September','October','November','December'];
    const months = this.lang === 'bn' ? monthsBN : monthsEN;
    setText('mess-month-lbl',`${months[this.month]} ${this.year}`);
    const mEntries=this.data.mess.entries.filter(e=>{const d=new Date(e.date);return d.getUTCMonth()===this.month&&d.getUTCFullYear()===this.year;});
    
    // Deposits
    const deposits = mEntries.filter(e => e.type === 'deposit');
    const totalDeposited = deposits.reduce((s,e) => s+e.amount, 0);

    // Expenses
    const expenses = mEntries.filter(e => e.type !== 'deposit');
    const totalExpenses = expenses.reduce((s,e) => s+e.amount, 0);

    // Shared expenses of the mess (payerId = 'mess-fund')
    const sharedExpenses = expenses.filter(e => e.payerId === 'mess-fund');
    const totalSharedExpenses = sharedExpenses.reduce((s,e) => s+e.amount, 0);

    // Fund balance (Remaining cash in box: deposits minus all cash box expenses)
    const fundBalance = totalDeposited - totalExpenses;

    const mc=this.data.mess.members.length;
    const share = mc>0 ? totalSharedExpenses/mc : 0;

    setText('mess-total',this.fmt(totalSharedExpenses));
    setText('mess-fund-bal',this.fmt(fundBalance));
    setText('mess-member-count',mc);
    setText('mess-per-head',mc>0?this.fmt(share):'৳০');

    // Members list with contribution
    const ml=g('mess-members-list'); const me=g('mess-members-empty');
    if(!mc){ml.innerHTML='';me.style.display='';}
    else{
      me.style.display='none';
      const mDeposits={};
      const mOutPocket={};
      
      deposits.forEach(e=>{mDeposits[e.payerId]=(mDeposits[e.payerId]||0)+e.amount;});
      expenses.forEach(e=>{
        if (e.payerId !== 'mess-fund') {
          mOutPocket[e.payerId]=(mOutPocket[e.payerId]||0)+e.amount;
        }
      });

      ml.innerHTML=this.data.mess.members.map((m,i)=>{
        const depAmt=mDeposits[m.id]||0;
        const outAmt=mOutPocket[m.id]||0;
        const diff=depAmt - share - outAmt;
        const clr=['#f97316','#3b82f6','#10b981','#a855f7','#f43f5e'][i%5];
        
        const isActive = (this.activeRoommates || []).some(u => u && u.name && u.name.trim().toLowerCase() === m.name.trim().toLowerCase());
        const activeIndicator = isActive ? ' <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:var(--green,#10b981);box-shadow:0 0 5px var(--green,#10b981);margin-left:5px" title="অনলাইন"></span>' : '';

        return `<div class="mess-member">
          <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
            <div class="mess-av" style="background:${clr}">${m.name[0]}</div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:13px;font-weight:700;color:var(--head);font-family:'Hind Siliguri',sans-serif;display:inline-flex;align-items:center">${m.name}${activeIndicator}</span>
                <button onclick="app.editMessMember('${m.id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:9px" title="${this.t('edit')}"><i class="fas fa-pen"></i></button>
                <button onclick="app.deleteMessMember('${m.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:9px;opacity:0.6" title="${this.t('delete')}"><i class="fas fa-trash"></i></button>
              </div>
              <div style="font-size:10px;color:var(--muted);font-family:'Hind Siliguri',sans-serif">${this.t('deposit')}: ${this.fmt(depAmt)} | ${this.t('personal_exp')}: ${this.fmt(outAmt)}</div>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:13px;font-weight:800;color:${diff>0?'var(--green)':diff<0?'var(--red)':'var(--muted)'};font-family:'Hind Siliguri',sans-serif">
              ${diff>0?'+':''}${this.fmt(Math.abs(diff))}
            </div>
            <div style="font-size:9px;font-weight:700;color:${diff>0?'var(--green)':diff<0?'var(--red)':'var(--muted)'};font-family:'Hind Siliguri',sans-serif">
              ${diff>0?this.t('surplus'):diff<0?this.t('deficit'):this.t('settled')}
            </div>
          </div>
        </div>`;
      }).join('');
    }

    // Entries table
    const el=g('mess-entries-list'); const ee=g('mess-entries-empty');
    if(!mEntries.length){el.innerHTML='';ee.style.display='';}
    else{
      ee.style.display='none';
      el.innerHTML=mEntries.map((e,idx)=>({ ...e, idx })).sort((a,b)=>{
        const diff=new Date(b.date)-new Date(a.date);
        if(diff!==0) return diff;
        return b.idx-a.idx;
      }).map(e=>{
        const isDep = e.type === 'deposit';
        let payerName = '-';
        if (e.payerId === 'mess-fund') {
          payerName = '📦 ' + this.t('mess_fund');
        } else {
          const payer=this.data.mess.members.find(m=>m.id===e.payerId);
          if (payer) payerName = payer.name;
        }
        const color = isDep ? 'var(--green)' : 'var(--p)';
        return `<tr>
          <td style="font-size:10px;color:var(--muted);white-space:nowrap">${e.date}</td>
          <td>
            <div style="font-size:12px;font-weight:700;color:var(--head);font-family:'Hind Siliguri',sans-serif">${e.title}</div>
            <div style="font-size:9px;color:var(--muted)">${isDep?this.t('deposit_to_fund'):(this.tCat(e.category)+(e.subcategory?` • ${e.subcategory}`:''))}</div>
          </td>
          <td style="font-size:11px;color:var(--text);font-family:'Hind Siliguri',sans-serif">${payerName}</td>
          <td style="text-align:right;font-size:12px;font-weight:800;color:${color};white-space:nowrap">${isDep?'+':''}${this.fmt(e.amount)}</td>
          <td><div style="display:flex;gap:3px"><button onclick="app.openMessEntry('${e.id}')" class="btn btn-s bsm bico"><i class="fas fa-pen" style="font-size:9px"></i></button><button onclick="app.deleteMessEntry2('${e.id}')" class="btn btn-d bsm bico"><i class="fas fa-trash" style="font-size:9px"></i></button></div></td>
        </tr>`;
      }).join('');
    }

    // Mess chart
    const catT={}; expenses.forEach(e=>{
      const translatedCat = this.tCat(e.category);
      catT[translatedCat]=(catT[translatedCat]||0)+e.amount;
    });
    const labels=Object.keys(catT); const data=Object.values(catT);
    if(this.charts.mess)this.charts.mess.destroy();
    const ctx=g('mess-chart'); if(ctx&&labels.length){
      const muted=getMuted();
      requestAnimationFrame(() => {
        this.charts.mess=new Chart(ctx,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:['#f97316','#f43f5e','#3b82f6','#10b981','#a855f7','#f59e0b'],borderColor:'transparent',borderWidth:0}]},options:{cutout:'72%',responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'},padding:7,usePointStyle:true}},tooltip:{callbacks:{label:c=>`${c.label}: ${this.fmt(c.parsed)}`}}}}});
      });
    }
  }

  deleteMessEntry2(id) {
    if(!confirm('এই এন্ট্রি মুছবেন?')) return;
    this.data.mess.entries=this.data.mess.entries.filter(e=>e.id!==id); this.save('mess'); this.toast('মুছে গেছে।','info'); this.renderMess();
  }

  // ── RENDER: BAZAR ─────────────────────────────────────────────
  renderBazar(filter=null) {
    if (!filter) {
      const activeTab = document.querySelector('#bazar-filter-tabs .tab.active');
      filter = activeTab ? activeTab.dataset.bfilter : 'pending';
    }
    let items=this.data.bazar;
    if(filter==='pending')items=items.filter(b=>!b.done);
    else if(filter==='done')items=items.filter(b=>b.done);
    const total=this.data.bazar.length; const done=this.data.bazar.filter(b=>b.done).length;
    setText('bz-total-items',total); setText('bz-done-items',done);
    const list=g('bazar-list'); const empty=g('bazar-empty'); if(!list) return;
    if(!items.length){list.innerHTML='';empty.style.display='';}
    else{
      empty.style.display='none';
      const prioOrder={high:0,mid:1,low:2};
      const sorted=[...items].sort((a,b)=>prioOrder[a.prio]-prioOrder[b.prio]);
      list.innerHTML=sorted.map(item=>{
        const pr = item.prio || 'low';
        return `<div class="bitem${item.done?' done':''}">
          <input type="checkbox" ${item.done?'checked':''} onchange="app.toggleBazar('${item.id}')">
          <span class="prio-dot ${pr}"></span>
          <div style="flex:1;min-width:0"><div class="bitem-name" style="font-size:13px;font-weight:700;color:var(--head);font-family:'Hind Siliguri',sans-serif">${item.name}</div>${item.qty?`<div style="font-size:10px;color:var(--muted)">${item.qty}</div>`:''}</div>
          <button onclick="app.openBazarEdit('${item.id}')" class="btn btn-s bsm bico"><i class="fas fa-pen" style="font-size:9px"></i></button>
        </div>`;
      }).join('');
    }
  }

  // ── RENDER: SPLITS ────────────────────────────────────────────
  renderSplits() {
    const active=this.data.splits.filter(s=>!s.settled);
    const done=this.data.splits.filter(s=>s.settled);
    const renderSplit=(s)=>`<div class="card" style="padding:14px;margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
        <div><div style="font-size:13px;font-weight:800;color:var(--head);font-family:'Hind Siliguri',sans-serif">${s.title}</div><div style="font-size:10px;color:var(--muted)">${s.date} · ${s.members.length} জন</div></div>
        <div style="text-align:right"><div style="font-size:15px;font-weight:900;color:var(--p);font-family:'Hind Siliguri',sans-serif">${this.fmt(s.totalAmount)}</div><div style="font-size:10px;color:var(--muted)">জন প্রতি ${this.fmt(s.totalAmount/s.members.length)}</div></div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px">${s.members.map(m=>`<span style="padding:3px 8px;border-radius:99px;background:var(--surface);border:1px solid var(--border);font-size:10px;font-weight:700;color:var(--head);font-family:'Hind Siliguri',sans-serif">${m.name}</span>`).join('')}</div>
      ${!s.settled?`<div style="display:flex;gap:6px"><button onclick="app.settleSplit('${s.id}')" class="btn btn-g bsm" style="flex:1"><i class="fas fa-check"></i> ${this.lang==='en'?'Mark Settled':'পরিশোধ সম্পন্ন'}</button><button onclick="app.deleteSplit('${s.id}')" class="btn btn-d bsm bico" title="মুছুন"><i class="fas fa-trash" style="font-size:9px"></i></button></div>`:`<div style="display:flex;align-items:center;justify-content:space-between"><span class="badge bg">${this.lang==='en'?'Settled ✓':'পরিশোধ হয়েছে ✓'}</span><button onclick="app.deleteSplit('${s.id}')" class="btn btn-d bsm bico" title="মুছুন" style="width:30px;height:30px;padding:0;display:inline-flex;align-items:center;justify-content:center"><i class="fas fa-trash" style="font-size:9px"></i></button></div>`}
    </div>`;

    const al=g('split-active-list'); const ae=g('split-empty');
    const dl=g('split-done-list'); const de=g('split-done-empty');
    if(!active.length){al.innerHTML='';ae.style.display='';}else{ae.style.display='none';al.innerHTML=active.map(renderSplit).join('');}
    if(!done.length){dl.innerHTML='';de.style.display='';}else{de.style.display='none';dl.innerHTML=done.map(renderSplit).join('');}
  }

  // ── RENDER: BUDGET ────────────────────────────────────────────
  renderBudget() {
    const monthsBN=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
    const monthsEN=['January','February','March','April','May','June','July','August','September','October','November','December'];
    const months = this.lang==='en' ? monthsEN : monthsBN;
    setText('budget-month-lbl',`${months[this.month]} ${this.year}`);
    const mTx=this.txForMonth(); const entries=Object.entries(this.data.budgets); const bl=g('budget-list'); const be=g('budget-empty');
    if(!entries.length){bl.innerHTML='';be.style.display='';}
    else{
      be.style.display='none'; let ts=0,tsp=0;
      bl.innerHTML=entries.map(([cat,lim])=>{
        const sp=mTx.filter(t=>t.type==='expense'&&t.category===cat).reduce((s,t)=>s+t.amount,0);
        const pct=Math.min(100,Math.round((sp/lim)*100)); const color=pct>=100?'var(--red)':pct>=80?'var(--amber)':'var(--green)';
        const status=pct>=100?(this.lang==='en'?'🚨 Over Limit':'🚨 সীমা পার'):pct>=80?(this.lang==='en'?'⚠️ Near Limit':'⚠️ প্রায় শেষ'):(this.lang==='en'?'✓ OK':'✓ ঠিক আছে');
        ts+=lim; tsp+=sp;
        return `<div style="padding:12px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
            <div style="font-size:12px;font-weight:700;color:var(--head);display:flex;align-items:center;gap:6px;font-family:'Hind Siliguri',sans-serif">${this.catEmoji(cat)} ${cat} <span style="font-size:9px;padding:1px 6px;border-radius:99px;background:${color}15;color:${color}">${status}</span></div>
            <div style="font-size:10px;color:var(--muted);font-family:'Hind Siliguri',sans-serif">${this.fmt(sp)} / ${this.fmt(lim)}</div>
          </div>
          <div style="height:5px;border-radius:99px;background:var(--border)"><div style="height:100%;width:${pct}%;border-radius:99px;background:${color};transition:width .8s"></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:3px"><span style="font-size:9px;color:var(--muted)">${pct}%</span><button onclick="app.deleteBudget('${cat}')" style="font-size:9px;color:var(--red);background:none;border:none;cursor:pointer;font-weight:700;font-family:'Hind Siliguri',sans-serif">${this.lang==='en'?'Delete':'মুছুন'}</button></div>
        </div>`;
      }).join('');
      setText('budget-total-set',this.fmt(ts)); setText('budget-total-spent',this.fmt(tsp));
      // Chart
      const COLORS=['#f97316','#f43f5e','#10b981','#f59e0b','#3b82f6','#a855f7'];
      if(this.charts.bud)this.charts.bud.destroy();
      const ctx=g('budget-chart'); if(ctx){
        const muted=getMuted();
        requestAnimationFrame(() => {
          this.charts.bud=new Chart(ctx,{type:'doughnut',data:{labels:entries.map(([c])=>c),datasets:[{data:entries.map(([,v])=>v),backgroundColor:COLORS,borderColor:'transparent',borderWidth:0}]},options:{cutout:'72%',responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'},padding:7,usePointStyle:true}},tooltip:{callbacks:{label:c=>`${c.label}: ${this.fmt(c.parsed)}`}}}}});
        });
      }
    }
  }

  // ── RENDER: GOALS ─────────────────────────────────────────────
  renderGoals() {
    const gg=g('goals-grid'); const ge=g('goals-empty'); if(!gg) return;
    if(!this.data.goals.length){gg.innerHTML='';ge.style.display='';}
    else{
      ge.style.display='none';
      gg.innerHTML=this.data.goals.map(gl=>{
        const pct=gl.target>0?Math.min(100,Math.round((gl.saved/gl.target)*100)):0;
        const daysLeft=gl.deadline?Math.ceil((new Date(gl.deadline)-new Date())/(1000*60*60*24)):null;
        const color=pct>=100?'#10b981':pct>=60?'#3b82f6':'#f97316';
        const circ=2*Math.PI*34; const dash=circ*(pct/100);
        return `<div class="card" style="padding:18px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
            <div class="ring-w"><svg width="76" height="76" viewBox="0 0 76 76"><circle class="rg" cx="38" cy="38" r="34"></circle><circle class="rf" cx="38" cy="38" r="34" stroke="${color}" stroke-dasharray="${dash} ${circ-dash}"></circle></svg><div class="rt" style="font-size:10px">${pct}%</div></div>
            <div style="flex:1;min-width:0"><div style="font-size:20px;line-height:1;margin-bottom:3px">${gl.icon||'🎯'}</div><div style="font-size:13px;font-weight:800;color:var(--head);font-family:'Hind Siliguri',sans-serif">${gl.name}</div>${daysLeft!==null?`<div style="font-size:9px;color:${daysLeft<0?'var(--red)':daysLeft<7?'var(--amber)':'var(--muted)'}">${daysLeft<0?(this.lang==='en'?'Expired':'সময় শেষ'):(this.lang==='en'?'⏰ '+daysLeft+' days left':'⏰ '+daysLeft+' দিন বাকি')}</div>`:''}</div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:5px">
            <div><div class="label">${this.lang==='en'?'Saved':'সঞ্চিত'}</div><div style="font-size:15px;font-weight:900;color:${color};font-family:'Hind Siliguri',sans-serif">${this.fmt(gl.saved)}</div></div>
            <div style="text-align:right"><div class="label">${this.lang==='en'?'Target':'লক্ষ্য'}</div><div style="font-size:15px;font-weight:900;color:var(--head);font-family:'Hind Siliguri',sans-serif">${this.fmt(gl.target)}</div></div>
          </div>
          <div style="height:5px;border-radius:99px;background:var(--border);margin-bottom:12px"><div style="height:100%;width:${pct}%;border-radius:99px;background:${color}"></div></div>
          <div style="display:flex;gap:5px">
            <button onclick="app.openContrib('${gl.id}')" class="btn btn-g bsm" style="flex:1"><i class="fas fa-plus"></i> ${this.lang==='en'?'Save':'সঞ্চয়'}</button>
            <button onclick="app.openGoalModal('${gl.id}')" class="btn btn-s bsm bico"><i class="fas fa-pen" style="font-size:9px"></i></button>
          </div>
        </div>`;
      }).join('');
    }
  }

  // ── RENDER: DEBTS ─────────────────────────────────────────────
  renderDebts() {
    const iOwe=this.data.debts.filter(d=>d.type==='i-owe'&&!d.settled);
    const owedMe=this.data.debts.filter(d=>d.type==='they-owe'&&!d.settled);
    setText('i-owe-total',this.fmt(iOwe.reduce((s,d)=>s+d.amount,0)));
    setText('owed-me-total',this.fmt(owedMe.reduce((s,d)=>s+d.amount,0)));
    const rd=(d)=>{
      const ov=d.due&&new Date(d.due)<new Date();
      return `<div class="dr${ov?' debt-ov':''}">
        <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:var(--head);font-family:'Hind Siliguri',sans-serif">${d.person}</div>${d.desc?`<div style="font-size:10px;color:var(--muted);font-family:'Hind Siliguri',sans-serif">${d.desc}</div>`:''} ${d.due?`<div style="font-size:10px;color:${ov?'var(--red)':'var(--muted)'};font-family:'Hind Siliguri',sans-serif">${this.lang==='en'?'Due':'তারিখ'}: ${d.due}${ov?(this.lang==='en'?' (Expired)':' (মেয়াদ শেষ)'):''}</div>`:''}</div>
        <div style="display:flex;align-items:center;gap:6px"><div style="font-size:13px;font-weight:800;color:${d.type==='i-owe'?'var(--red)':'var(--green)'};font-family:'Hind Siliguri',sans-serif">${this.fmt(d.amount)}</div><button onclick="app.settleDebt('${d.id}')" class="btn btn-g bsm" title="পরিশোধ"><i class="fas fa-check"></i></button><button onclick="app.openDebtModal('${d.id}')" class="btn btn-s bsm bico"><i class="fas fa-pen" style="font-size:9px"></i></button></div>
      </div>`;
    };
    const il=g('i-owe-list');const ie=g('i-owe-empty');const ol=g('owed-me-list');const oe=g('owed-me-empty');
    if(!iOwe.length){il.innerHTML='';ie.style.display='';}else{ie.style.display='none';il.innerHTML=iOwe.map(rd).join('');}
    if(!owedMe.length){ol.innerHTML='';oe.style.display='';}else{oe.style.display='none';ol.innerHTML=owedMe.map(rd).join('');}
  }

  // ── RENDER: REPORTS ───────────────────────────────────────────
  renderReports() {
    const allTx=this.data.transactions;
    const inc=allTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const exp=allTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    const sr=inc>0?Math.round(((inc-exp)/inc)*100):0;
    setText('r-income',this.fmtK(inc)); setText('r-expense',this.fmtK(exp)); setText('r-save-rate',`${sr}%`); setText('r-count',allTx.length);
    const mBn=['জান','ফেব','মার্চ','এপ্রি','মে','জুন','জুল','আগ','সেপ','অক্টো','নভে','ডিসে'];
    const mEn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mActive=this.lang==='en'?mEn:mBn;
    const now=new Date(); const bl=[],bi=[],be=[];
    for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);bl.push(mActive[d.getMonth()]);const tx=this.txForMonth(d.getMonth(),d.getFullYear());bi.push(tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));be.push(tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));}
    const muted=getMuted();
    if(this.charts.rBar)this.charts.rBar.destroy();
    const ctx1=g('r-bar');
    if(this.charts.rCat)this.charts.rCat.destroy();
    const ctx2=g('r-cat');
    if(this.charts.rDow)this.charts.rDow.destroy();
    const ctx3=g('r-dow');

    requestAnimationFrame(() => {
      if(ctx1)this.charts.rBar=new Chart(ctx1,{type:'bar',data:{labels:bl,datasets:[{label:this.t('income_lbl'),data:bi,backgroundColor:'rgba(16,185,129,.6)',borderRadius:5},{label:this.t('expense_lbl'),data:be,backgroundColor:'rgba(244,63,94,.6)',borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'},usePointStyle:true}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${this.fmt(c.parsed.y)}`}}},scales:{x:{grid:{display:false},ticks:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'}}},y:{grid:{color:'rgba(255,255,255,.03)'},ticks:{color:muted,font:{size:9,family:'Hind Siliguri'},callback:v=>this.fmtK(v)}}}}});
      
      const catT={};allTx.filter(t=>t.type==='expense').forEach(t=>{catT[t.category]=(catT[t.category]||0)+t.amount;});
      const sc=Object.entries(catT).sort((a,b)=>b[1]-a[1]);
      if(ctx2)this.charts.rCat=new Chart(ctx2,{type:'doughnut',data:{labels:sc.map(([c])=>c),datasets:[{data:sc.map(([,v])=>v),backgroundColor:['#f97316','#f43f5e','#10b981','#f59e0b','#3b82f6','#a855f7','#06b6d4','#ec4899'],borderColor:'transparent',borderWidth:0}]},options:{cutout:'72%',responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'},padding:7,usePointStyle:true}},tooltip:{callbacks:{label:c=>`${c.label}: ${this.fmt(c.parsed)}`}}}}});
      
      const tc=g('top-cats');
      if(tc){const max=sc[0]?.[1]||1;tc.innerHTML=sc.slice(0,5).map(([cat,amt],i)=>{const pct=Math.round((amt/max)*100);const clrs=['#f97316','#f43f5e','#10b981','#f59e0b','#3b82f6'][i];return `<div><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-size:12px;font-weight:700;color:var(--head);font-family:'Hind Siliguri',sans-serif">${this.catEmoji(cat)} ${cat}</span><span style="font-size:12px;font-weight:800;color:var(--head);font-family:'Hind Siliguri',sans-serif">${this.fmt(amt)}</span></div><div style="height:4px;border-radius:99px;background:var(--border)"><div style="height:100%;width:${pct}%;border-radius:99px;background:${clrs}"></div></div></div>`;}).join('');}
      
      const dow=[0,0,0,0,0,0,0];allTx.filter(t=>t.type==='expense').forEach(t=>{const day=new Date(t.date).getDay();dow[day]+=t.amount;});
      if(ctx3)this.charts.rDow=new Chart(ctx3,{type:'bar',data:{labels:this.lang==='en'?['Sun','Mon','Tue','Wed','Thu','Fri','Sat']:['রবি','সোম','মঙ্গল','বুধ','বৃহ','শুক্র','শনি'],datasets:[{data:dow,backgroundColor:dow.map(v=>v===Math.max(...dow)?'rgba(249,115,22,.7)':'rgba(249,115,22,.25)'),borderRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${this.fmt(c.parsed.y)}`}}},scales:{x:{grid:{display:false},ticks:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'}}},y:{display:false}}}});
    });
    this.renderCalendar();
  }

  // ── CALENDAR ──────────────────────────────────────────────────
  bindCalendar() {
    g('cal-prev')?.addEventListener('click',()=>{this.calMonth--;if(this.calMonth<0){this.calMonth=11;this.calYear--;}this.renderCalendar();});
    g('cal-next')?.addEventListener('click',()=>{this.calMonth++;if(this.calMonth>11){this.calMonth=0;this.calYear++;}this.renderCalendar();});
  }

  renderCalendar() {
    const monthsBN=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
    const monthsEN=['January','February','March','April','May','June','July','August','September','October','November','December'];
    const months=this.lang==='en'?monthsEN:monthsBN;
    setText('cal-label',`${months[this.calMonth]} ${this.calYear}`);
    const headers=g('cal-headers'); const grid=g('cal-grid'); if(!headers||!grid) return;
    headers.innerHTML=(this.lang==='en'?['Su','Mo','Tu','We','Th','Fr','Sa']:['র','স','ম','বু','বৃ','শু','শ']).map(d=>`<div class="cdh">${d}</div>`).join('');
    const first=new Date(this.calYear,this.calMonth,1).getDay();
    const dim=new Date(this.calYear,this.calMonth+1,0).getDate();
    const today=new Date(); const byDate={};
    
    const getK = (dateStr) => {
        if(!dateStr) return null;
        const d = new Date(dateStr);
        if(dateStr.includes('T')) {
            if(d.getMonth()!==this.calMonth||d.getFullYear()!==this.calYear)return null;
            return d.getDate();
        } else {
            if(d.getUTCMonth()!==this.calMonth||d.getUTCFullYear()!==this.calYear)return null;
            return d.getUTCDate();
        }
    };

    this.data.transactions.forEach(t=>{
      const k = getK(t.date);
      if(!k)return;
      if(!byDate[k])byDate[k]={income:0,expense:0};
      if(t.type==='income')byDate[k].income+=t.amount;
      else if(t.type==='expense')byDate[k].expense+=t.amount;
    });
    
    (this.data.mess?.entries||[]).forEach(t=>{
      const k = getK(t.date);
      if(!k)return;
      if(!byDate[k])byDate[k]={income:0,expense:0};
      if(t.type==='deposit')byDate[k].income+=t.amount;
      else if(t.type==='expense')byDate[k].expense+=t.amount;
    });

    (this.data.bazar||[]).forEach(t=>{
      const k = getK(t.addedAt);
      if(!k)return;
      if(!byDate[k])byDate[k]={income:0,expense:0};
      byDate[k].expense+=1;
    });

    let html='';
    for(let i=0;i<first;i++)html+=`<div class="cd cx"></div>`;
    for(let day=1;day<=dim;day++){
      const isT=today.getDate()===day&&today.getMonth()===this.calMonth&&today.getFullYear()===this.calYear;
      const info=byDate[day]; let cls='cd'; if(isT)cls+=' ct';
      if(info){if(info.income&&info.expense)cls+=' cb';else if(info.income)cls+=' ci';else if(info.expense)cls+=' ce';}
      html+=`<div class="${cls}" onclick="app.showCalDay(${day})">${day}</div>`;
    }
    grid.innerHTML=html;
  }

  showCalDay(day) {
    const detail=g('cal-detail'); if(!detail) return;
    
    const matchYMD = (dateStr) => {
      if(!dateStr) return false;
      const d = new Date(dateStr);
      if (dateStr.includes('T')) {
         return d.getDate()===day && d.getMonth()===this.calMonth && d.getFullYear()===this.calYear;
      } else {
         return d.getUTCDate()===day && d.getUTCMonth()===this.calMonth && d.getUTCFullYear()===this.calYear;
      }
    };

    const tx = this.data.transactions.filter(t => matchYMD(t.date));
    const me = (this.data.mess?.entries||[]).filter(t => matchYMD(t.date));
    const bz = (this.data.bazar||[]).filter(t => matchYMD(t.addedAt));

    detail.style.display='';
    
    let html = `<div style="font-size:13px;font-weight:800;color:var(--p);margin-bottom:8px;font-family:'Hind Siliguri',sans-serif;border-bottom:1px solid var(--border);padding-bottom:6px">${this.calYear}-${String(this.calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')} তারিখের বিস্তারিত</div>`;
    
    if (!tx.length && !bz.length && !me.length) {
      html += `<div style="font-size:12px;color:var(--muted);font-family:'Hind Siliguri',sans-serif;text-align:center;padding:14px 0">কোন কাজ বা লেনদেন নেই</div>`;
    } else {
      if (tx.length) {
        html += `<div style="font-size:10px;font-weight:800;color:var(--muted);margin-top:10px;margin-bottom:4px;text-transform:uppercase">ব্যক্তিগত লেনদেন</div>`;
        html += tx.map(t=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed var(--border);font-size:12px"><span style="font-family:'Hind Siliguri',sans-serif">${this.catEmoji(t.category)} ${t.title}</span><span style="font-weight:800;color:${t.type==='income'?'var(--green)':'var(--red)'};">${t.type==='income'?'+':'-'}${this.fmt(t.amount)}</span></div>`).join('');
      }
      if (me.length) {
        html += `<div style="font-size:10px;font-weight:800;color:var(--muted);margin-top:10px;margin-bottom:4px;text-transform:uppercase">মেসের হিসাব</div>`;
        html += me.map(t=>{
            const m = (this.data.mess?.members||[]).find(x=>x.id===t.payerId);
            const mName = m ? m.name : (t.payerId==='mess-fund' ? (this.lang==='en'?'Mess Fund':'মেস ফান্ড') : (this.lang==='en'?'Unknown':'অজানা'));
            return `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed var(--border);font-size:12px"><span style="font-family:'Hind Siliguri',sans-serif">🍽️ ${mName} (${t.type==='deposit'?'জমা':'খরচ'})</span><span style="font-weight:800;color:${t.type==='deposit'?'var(--green)':'var(--red)'};">${this.fmt(t.amount)}</span></div>`;
        }).join('');
      }
      if (bz.length) {
        html += `<div style="font-size:10px;font-weight:800;color:var(--muted);margin-top:10px;margin-bottom:4px;text-transform:uppercase">বাজার তালিকা</div>`;
        html += bz.map(t=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed var(--border);font-size:12px"><span style="font-family:'Hind Siliguri',sans-serif">${t.done?'✅':'🛒'} ${t.name}</span><span style="font-weight:800;color:var(--muted);">${t.qty||''}</span></div>`).join('');
      }
    }
    detail.innerHTML = html;
  }

  // ── THEME & PROFILE ───────────────────────────────────────────
  applyTheme() {
    if(this.data.settings.theme==='light')document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
    const icon=`<i class="fas fa-${this.data.settings.theme==='light'?'moon':'sun'}"></i>`;
    const tt=g('theme-toggle'); if(tt)tt.innerHTML=icon;
    const ttm=g('theme-toggle-mob'); if(ttm)ttm.innerHTML=icon;
    Object.values(this.charts).forEach(c=>{if(c)c.destroy();});
    this.charts={};
  }

  applyProfile() {
    const i=this.data.settings.initials||'SA';
    const initText = i.trim().split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase() || 'SA';
    const photo=localStorage.getItem('bk_avatar');
    
    // Sidebar profile button
    const sImg=g('profile-pic'); const sTxt=g('profile-initials');
    if(sImg && sTxt){
      if(photo){ sImg.src=photo; sImg.style.display=''; sTxt.style.display='none'; }
      else { sImg.style.display='none'; sTxt.textContent=initText; sTxt.style.display=''; }
    }
    
    // Profile modal
    const pImg=g('p-pic-lg'); const pTxt=g('p-initials-lg');
    if(pImg && pTxt){
      if(photo){ pImg.src=photo; pImg.style.display=''; pTxt.style.display='none'; }
      else { pImg.style.display='none'; pTxt.textContent=initText; pTxt.style.display=''; }
    }
    
    setText('p-name-display',`${i}-এর ব্যাচেলর খাতা`);
    const piEl=g('p-initials'); if(piEl)piEl.value=i;
  }

  bindProfile() {
    g('profile-btn')?.addEventListener('click',()=>this.openModal('m-profile'));
    [g('theme-toggle'),g('theme-toggle-mob')].forEach(btn=>{btn?.addEventListener('click',()=>{this.data.settings.theme=this.data.settings.theme==='dark'?'light':'dark';this.save('settings');this.applyTheme();this.render();this.toast(`${this.data.settings.theme==='dark'?'ডার্ক':'লাইট'} মোড চালু!`,'success');});});
    g('p-initials')?.addEventListener('input',e=>{
      const v=e.target.value;
      const trimmed=v.trim();
      this.data.settings.initials=trimmed||'SA';
      this.save('settings');
      
      const i=trimmed||'SA';
      const initText=i.split(' ').map(x=>x[0]).join('').substring(0,2).toUpperCase()||'SA';
      const photo=localStorage.getItem('bk_avatar');
      
      const sTxt=g('profile-initials'); if(sTxt && !photo) sTxt.textContent=initText;
      const pTxt=g('p-initials-lg'); if(pTxt && !photo) pTxt.textContent=initText;
      setText('p-name-display',`${i}-এর ব্যাচেলর খাতা`);
    });
    g('p-avatar')?.addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;if(f.size>1.5*1024*1024){this.toast('ফাইল খুব বড়। সর্বোচ্চ ১.৫MB।','error');return;}const r=new FileReader();r.onload=ev=>{localStorage.setItem('bk_avatar',ev.target.result);this.applyProfile();this.toast('ছবি আপলোড হয়েছে!','success');};r.readAsDataURL(f);});
    g('p-rm-photo')?.addEventListener('click',()=>{localStorage.removeItem('bk_avatar');this.applyProfile();this.toast('ছবি সরানো হয়েছে।','info');});
    g('p-reset')?.addEventListener('click',()=>{if(confirm('সব ডেটা মুছে যাবে! নিশ্চিত?')&&confirm('আপনি কি সত্যিই নিশ্চিত?')){localStorage.clear();this.toast('সব ডেটা মুছা হয়েছে।','warning');setTimeout(()=>location.reload(),800);}});
  }

  // ── CLOUD SYNC & SHARING ───────────────────────────────────────
  bindSync() {
    g('p-sync-btn-create')?.addEventListener('click', () => this.handleSyncCreateUI());
    g('p-sync-btn-scan')?.addEventListener('click', () => this.openModal('m-join-room'));
    g('join-room-btn')?.addEventListener('click', () => this.handleJoinRoom());
    g('p-sync-btn-copy')?.addEventListener('click', () => this.handleCopyCode());
    g('p-sync-btn-disconnect')?.addEventListener('click', () => this.handleSyncDisconnect());
    g('p-sync-now')?.addEventListener('click', () => this.handleSyncNow());
    g('header-sync-btn')?.addEventListener('click', () => this.handleSyncNow());
    g('mess-sync-btn')?.addEventListener('click', () => this.openModal('m-group-sync'));
    g('bazar-sync-btn')?.addEventListener('click', () => this.openModal('m-group-sync'));
    this.applySyncUI();
  }

  applySyncUI() {
    const id = this.data.settings.syncId;
    const last = this.data.settings.lastSync;
    
    const discUI = g('p-sync-disconnected-ui');
    const connUI = g('p-sync-connected-ui');
    const codeText = g('p-sync-code-text');
    const hSync = g('header-sync-btn');
    const pStatus = g('p-sync-status');
    
    if (id) {
      if (discUI) discUI.style.display = 'none';
      if (connUI) connUI.style.display = 'flex';
      if (codeText) codeText.textContent = id;
      if (hSync) hSync.style.display = 'inline-flex';
      if (pStatus) pStatus.textContent = last ? `সর্বশেষ সিঙ্ক: ${last}` : 'সংযুক্ত করা হয়েছে।';
      this.syncActiveRoommates().catch(() => {});
    } else {
      if (discUI) discUI.style.display = 'flex';
      if (connUI) connUI.style.display = 'none';
      if (hSync) hSync.style.display = 'none';
      if (pStatus) pStatus.textContent = '';
    }
  }

  compressData() {
    try {
      const short = {
        m_entries: (this.data.mess.entries || []).map(x => ({
          i: x.id, y: x.type, t: x.title, a: x.amount, d: x.date, p: x.payerId, c: x.category, sc: x.subcategory || ''
        })),
        m_members: (this.data.mess.members || []).map(x => ({
          i: x.id, n: x.name
        })),
        m_subcats: this.data.mess.subcategories || {},
        z: (this.data.bazar || []).map(x => ({
          i: x.id, n: x.name, q: x.qty, p: x.prio || 'low', d: x.done ? 1 : 0, a: x.addedAt || ''
        }))
      };
      
      const jsonStr = JSON.stringify(short);
      const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
      // Convert to URL-safe base64
      return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    } catch(e) {
      console.error(e);
      this.toast('ডেটা কম্প্রেস করতে সমস্যা হয়েছে।', 'error');
      return null;
    }
  }

  decompressData(urlSafeB64) {
    try {
      // Restore standard base64 from URL-safe base64
      let b64 = urlSafeB64.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) {
        b64 += '=';
      }
      
      const jsonStr = decodeURIComponent(escape(atob(b64)));
      const short = JSON.parse(jsonStr);
      
      return {
        mess: {
          entries: (short.m_entries || []).map(x => ({
            id: x.i, type: x.y, title: x.t, amount: x.a, date: x.d, payerId: x.p, category: x.c, subcategory: x.sc || ''
          })),
          members: (short.m_members || []).map(x => ({
            id: x.i, name: x.n
          })),
          subcategories: short.m_subcats || {}
        },
        bazar: (short.z || []).map(x => ({
          id: x.i, name: x.n, qty: x.q, price: 0, prio: x.p || 'low', done: x.d === 1, addedAt: x.a || ''
        }))
      };
    } catch(e) {
      console.error(e);
      this.toast('ডেটা ডিকম্প্রেস করতে সমস্যা হয়েছে।', 'error');
      return null;
    }
  }

  async syncActiveRoommates() {
    const id = this.data.settings.syncId;
    if (!id) return;
    try {
      const res = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/swnr32ym/bk_active_devices_${id}`);
      let list = [];
      if (res.ok) {
        const text = await res.text();
        if (text && text !== '""' && text !== 'null') {
          list = JSON.parse(text);
        }
      }
      
      const now = Date.now();
      // Keep only active users from the last 15 minutes
      const activeWindow = 15 * 60 * 1000;
      list = list.filter(u => u && u.name && (now - u.time < activeWindow));
      
      // Update/add current user
      const myName = this.data.settings.initials || 'SA';
      const myEntry = list.find(u => u.name === myName);
      if (myEntry) {
        myEntry.time = now;
      } else {
        list.push({ name: myName, time: now });
      }
      
      // Save back to server
      await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/swnr32ym/bk_active_devices_${id}?value=${encodeURIComponent(JSON.stringify(list))}`, {
        method: 'POST',
        body: ''
      });
      
      // Render active users list in UI
      const countEl = g('p-active-count');
      const listEl = g('p-active-list');
      if (countEl) countEl.textContent = list.length;
      if (listEl) {
        listEl.innerHTML = list.map(u => {
          const isMe = u.name === myName;
          return `<span class="badge ${isMe ? 'bg' : 'bp'}" style="font-family:'Hind Siliguri',sans-serif">${u.name}${isMe ? ' (তুমি)' : ''}</span>`;
        }).join('');
      }
    } catch (e) {
      console.error("Active roommates sync failed:", e);
    }
  }

  async cloudUpload(silent = false) {
    const id = this.data.settings.syncId;
    if(!id || this.isSyncing) return;
    try {
      const syncBtn = g('header-sync-btn');
      const icon = syncBtn?.querySelector('i');
      if(icon && !silent) icon.className = 'fas fa-rotate fa-spin';
      
      const compressedStr = this.compressData();
      if (!compressedStr) throw new Error("Compression failed");
      
      // Divide into chunks of 900 characters each to bypass ASP.NET route limit
      const chunkSize = 900;
      const chunks = [];
      for (let i = 0; i < compressedStr.length; i += chunkSize) {
        chunks.push(compressedStr.substring(i, i + chunkSize));
      }
      
      // Upload chunks to KV store
      for (let i = 0; i < chunks.length; i++) {
        const res = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/swnr32ym/bk_data_${id}_${i}?value=${encodeURIComponent(chunks[i])}`, {
          method: 'POST',
          body: ''
        });
        if (!res.ok) throw new Error(`Chunk ${i} upload failed`);
      }
      
      // Save chunk count
      const countRes = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/swnr32ym/bk_data_${id}_count?value=${chunks.length}`, {
        method: 'POST',
        body: ''
      });
      if (!countRes.ok) throw new Error("Count upload failed");
      
      this.data.settings.lastSync = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.save('settings');
      this.applySyncUI();
      
      if(icon && !silent) icon.className = 'fas fa-rotate';
    } catch(err) {
      console.error(err);
      if(!silent) this.toast('ক্লাউডে ডেটা আপলোড করা যায়নি।','error');
      const syncBtn = g('header-sync-btn');
      const icon = syncBtn?.querySelector('i');
      if(icon && !silent) icon.className = 'fas fa-rotate';
    }
  }

  async cloudDownload(silent = false) {
    const id = this.data.settings.syncId;
    if(!id) return;
    try {
      const syncBtn = g('header-sync-btn');
      const icon = syncBtn?.querySelector('i');
      if(icon && !silent) icon.className = 'fas fa-rotate fa-spin';
      
      // Read chunk count
      const countRes = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/swnr32ym/bk_data_${id}_count`);
      if (!countRes.ok) throw new Error("Fetch count failed");
      
      const rawCount = await countRes.text();
      let count = 0;
      if (rawCount && rawCount.trim() !== '' && rawCount !== '""' && rawCount !== 'null') {
        count = parseInt(JSON.parse(rawCount));
      }
      
      if (count > 0) {
        // Fetch all chunks concurrently
        const fetchPromises = [];
        for (let i = 0; i < count; i++) {
          fetchPromises.push(
            fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/swnr32ym/bk_data_${id}_${i}`)
              .then(res => res.json())
          );
        }
        
        const chunks = await Promise.all(fetchPromises);
        const joinedStr = chunks.join('');
        const remoteData = this.decompressData(joinedStr);
        
        if (remoteData) {
          this.isSyncing = true;
          try {
            if (remoteData.mess) this.data.mess = remoteData.mess;
            if (remoteData.bazar) this.data.bazar = remoteData.bazar;
            this.data.settings.lastSync = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            this.save('settings');
            this.save('mess');
            this.save('bazar');
            this.applySyncUI();
            this.render();
          } finally {
            this.isSyncing = false;
          }
        }
      }
      
      if(icon && !silent) icon.className = 'fas fa-rotate';
    } catch(err) {
      console.error(err);
      if(!silent) this.toast('ক্লাউড থেকে ডেটা ডাউনলোড করা যায়নি।','error');
      const syncBtn = g('header-sync-btn');
      const icon = syncBtn?.querySelector('i');
      if(icon && !silent) icon.className = 'fas fa-rotate';
    }
  }

  async handleSyncCreateUI() {
    if(confirm('নতুন মেস তৈরি করলে আপনার বর্তমান ডেটা ক্লাউডে আপলোড হবে। নিশ্চিত?')) {
      // Generate a unique 6-character ID
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomId = '';
      for(let i=0; i<6; i++) randomId += chars.charAt(Math.floor(Math.random() * chars.length));
      
      this.data.settings.syncId = randomId;
      this.data.settings.lastSync = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.save('settings');
      
      this.toast('মেস কোড তৈরি হচ্ছে...', 'info');
      // Upload current local database under this ID
      await this.cloudUpload();
      this.applySyncUI();
      this.toast('মেস সফলভাবে তৈরি হয়েছে! রুমমেটদের কোডটি দিন।', 'success');
      this.initNotifications().then(() => {
        this.startBackgroundChatPoll();
      });
    }
  }

  async handleJoinRoom() {
    const codeInput = g('join-room-code');
    const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
    if(!code || code.length < 6) {
      this.toast('দয়া করে সঠিক মেস কোডটি দিন।', 'error');
      return;
    }
    await this.connectToRoomId(code);
  }

  handleCopyCode() {
    const id = this.data.settings.syncId;
    if(id) {
      navigator.clipboard.writeText(id).then(() => {
        this.toast('কোড কপি করা হয়েছে!', 'success');
      });
    }
  }

  async connectToRoomId(roomId) {
    this.toast('মেস ডেটা লোড করা হচ্ছে...', 'info');
    const btn = g('join-room-btn');
    if(btn) { btn.disabled = true; btn.textContent = 'অপেক্ষা করুন...'; }
    try {
      // Test fetch count first to verify validity of the scanned ID
      const countRes = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/swnr32ym/bk_data_${roomId}_count`);
      if (!countRes.ok) throw new Error("Invalid ID");
      
      const rawCount = await countRes.text();
      if (!rawCount || rawCount.trim() === '' || rawCount === '""' || rawCount === 'null') {
        throw new Error("Empty count");
      }
      
      if (confirm('মেস কোড পাওয়া গেছে! আপনি কি এই ডেটা লোড করতে চান? আপনার বর্তমান সমস্ত লোকাল ডেটা মুছে যাবে!')) {
        this.data.settings.syncId = roomId;
        this.save('settings');
        
        await this.cloudDownload();
        this.applySyncUI();
        this.closeModal('m-join-room');
        this.toast('সফলভাবে শেয়ার মেসে যোগ দিয়েছেন!', 'success');
        this.initNotifications().then(() => {
          this.startBackgroundChatPoll();
        });
      } else {
        this.closeModal('m-join-room');
      }
    } catch(err) {
      console.error(err);
      this.toast('মেস পাওয়া যায়নি। কোডটি সঠিক কিনা যাচাই করুন।', 'error');
    }
    if(btn) { btn.disabled = false; btn.textContent = 'যুক্ত হোন'; }
  }

  async handleSyncDisconnect() {
    if (confirm('মেস লিংক সরাতে চান? এর পর থেকে অফলাইনে ডেটা সেভ হবে।')) {
      const id = this.data.settings.syncId;
      const myName = this.data.settings.initials || 'SA';
      if (id) {
        try {
          const res = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/swnr32ym/bk_active_devices_${id}`);
          if (res.ok) {
            const text = await res.text();
            if (text && text !== '""' && text !== 'null') {
              let list = JSON.parse(text);
              list = list.filter(u => u && u.name && u.name !== myName);
              await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/swnr32ym/bk_active_devices_${id}?value=${encodeURIComponent(JSON.stringify(list))}`, {
                method: 'POST',
                body: ''
              });
            }
          }
        } catch(e) {}
      }
      
      this.data.settings.syncId = '';
      this.data.settings.lastSync = '';
      this.save('settings');
      this.applySyncUI();
      this.toast('মেস লিংক সফলভাবে সরানো হয়েছে।', 'info');
    }
  }

  async handleSyncNow() {
    this.toast('সিঙ্কিং হচ্ছে...','info');
    await this.cloudDownload();
    await this.cloudUpload();
    this.toast('সিঙ্ক সম্পন্ন হয়েছে! ✓','success');
  }

  // ── EXPORT CSV ────────────────────────────────────────────────
  exportCSV() {
    const headers=['তারিখ','বিবরণ','ধরন','ক্যাটাগরি','একাউন্ট','পরিমাণ','নোট','ট্যাগ'];
    const rows=this.data.transactions.map(t=>{const acc=this.getAcc(t.accountId);return[t.date,`"${t.title}"`,t.type,t.category,acc?acc.name:'',t.amount,`"${t.notes||''}"`,`"${(t.tags||[]).join(',')}"`].join(',');});
    const csv=[headers.join(','),...rows].join('\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`bachelor_khata_${new Date().toISOString().split('T')[0]}.csv`;a.click();
    URL.revokeObjectURL(url);
    this.toast('CSV ডাউনলোড হচ্ছে!','success');
  }

  // ── TOAST ─────────────────────────────────────────────────────
  toast(msg, type='info') {
    const wrap=g('tw'); if(!wrap) return;
    const el=document.createElement('div'); el.className='toast';
    const icons={info:'fa-info-circle',success:'fa-circle-check',error:'fa-circle-exclamation',warning:'fa-triangle-exclamation'};
    const bgColors={info:'#3b82f6',success:'#10b981',error:'#f43f5e',warning:'#f59e0b'};
    el.style.background = bgColors[type] || bgColors.info;
    el.style.color = '#fff';
    el.style.border = 'none';
    el.innerHTML=`<i class="fas ${icons[type]||'fa-info-circle'}" style="color:#fff;font-size:16px;flex-shrink:0"></i><span style="font-family:'Hind Siliguri',sans-serif;font-size:13px;font-weight:600">${msg}</span>`;
    wrap.appendChild(el); setTimeout(()=>el.classList.add('show'),15);
    setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),500);},3500);
  }

  // ── MESS CHAT ──────────────────────────────────────────────────
  bindChat() {
    g('chat-send-btn')?.addEventListener('click', () => this.sendChatMessage());
    g('chat-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendChatMessage();
    });
    g('chat-refresh-btn')?.addEventListener('click', () => this.cloudDownloadChat());
    g('cancel-reply-btn')?.addEventListener('click', () => this.cancelChatReply());
  }

  initChat() {
    const syncId = this.data.settings.syncId;
    const notSynced = g('chat-not-synced');
    const panel = g('chat-active-panel');
    if (!syncId) {
      if (notSynced) notSynced.style.display = 'flex';
      if (panel) panel.style.display = 'none';
      return;
    }

    if (notSynced) notSynced.style.display = 'none';
    if (panel) panel.style.display = 'flex';

    this.cloudDownloadChat();
    this.startBackgroundChatPoll();
  }

  renderChat() {
    this.initChat();
  }

  async cloudDownloadChat(silent = false) {
    const syncId = this.data.settings.syncId;
    if (!syncId) return;

    try {
      if (!silent) {
        const refreshIcon = g('chat-refresh-btn')?.querySelector('i');
        if (refreshIcon) refreshIcon.className = 'fas fa-rotate fa-spin';
      }

      const res = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/swnr32ym/bk_chat_${syncId}`);
      if (res.ok) {
        const text = await res.text();
        let msgs = [];
        if (text && text !== '""' && text !== 'null' && text.trim() !== '') {
          try {
            let parsed = JSON.parse(text);
            // Server sometimes wraps value in extra quotes, decode if needed
            if (typeof parsed === 'string') {
              parsed = JSON.parse(parsed);
            }
            if (Array.isArray(parsed)) {
              msgs = parsed.filter(m => m && typeof m === 'object');
            }
          } catch(err) {
            console.error("Corrupted chat data:", err);
            msgs = [];
          }
        }
        
        this.chatMsgsCount = msgs.length;
        if (this.page === 'chat') {
           this.data.lastReadChatCount = msgs.length;
           localStorage.setItem('bk_chat_read', msgs.length.toString());
        }
        
        this.renderChatMessages(msgs);
      }

      if (!silent) {
        const refreshIcon = g('chat-refresh-btn')?.querySelector('i');
        if (refreshIcon) refreshIcon.className = 'fas fa-rotate';
      }
    } catch (e) {
      console.error("Chat download failed:", e);
      if (!silent) this.toast('চ্যাট মেসেজ লোড করা যায়নি।', 'error');
    }
  }

  renderChatMessages(msgs) {
    const container = g('chat-messages-container');
    if (!container) return;

    if (!msgs || msgs.length === 0) {
      container.innerHTML = `<div style="text-align:center;color:var(--muted);font-size:11px;margin-top:20px;font-family:'Hind Siliguri',sans-serif">কোনো বার্তা নেই। প্রথম বার্তাটি লিখুন!</div>`;
      return;
    }

    const myInitials = this.data.settings.initials || 'SA';

    container.innerHTML = msgs.filter(m => m && typeof m === 'object').map(m => {
      const decodedText = this._decodeMsg(m.text);
      const senderName = m.sender || 'Unknown';
      const isMe = senderName === myInitials;
      const clr = isMe ? 'linear-gradient(135deg, #38bdf8, #0ea5e9)' : 'var(--surface2)';
      const align = isMe ? 'flex-end' : 'flex-start';
      const borderRad = isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px';
      const color = isMe ? '#fff' : 'var(--head)';
      const border = isMe ? 'none' : '1px solid var(--border)';
      
      // Reply preview in bubble
      let replyHtml = '';
      if (m.replyTo && typeof m.replyTo === 'object') {
        const replyDecodedText = this._decodeMsg(m.replyTo.text);
        const replySender = m.replyTo.sender || 'Unknown';
        replyHtml = `
          <div style="background:rgba(0,0,0,0.1);padding:6px;border-radius:6px;font-size:10px;border-left:2px solid ${isMe ? '#fff' : 'var(--p)'};margin-bottom:6px;opacity:0.9">
            <span style="font-weight:800;color:${isMe ? '#fff' : 'var(--p)'}">${replySender}</span>: ${replyDecodedText}
          </div>
        `;
      }

      const senderHtml = isMe ? '' : `<div style="font-size:9.5px;font-weight:800;color:var(--muted);margin-bottom:2px;margin-left:4px">${senderName}</div>`;
      const timeHtml = m.time || '';
      const safeId = m.id || '';
      const safeDecodedText = decodedText.replace(/"/g, '&quot;');
      const safeDecodedTextApos = decodedText.replace(/'/g, "\\'");

      return `
        <div style="align-self:${align};display:flex;flex-direction:column;max-width:80%;position:relative" class="chat-msg-wrapper" data-msg-id="${safeId}" data-sender="${senderName}" data-text="${safeDecodedText}">
          ${senderHtml}
          <div style="background:${clr};color:${color};border:${border};border-radius:${borderRad};padding:8px 12px;font-size:12.5px;box-shadow:0 2px 4px rgba(0,0,0,0.05);position:relative">
            ${replyHtml}
            <div style="font-family:'Hind Siliguri',sans-serif;line-height:1.5;word-break:break-word">${decodedText}</div>
            <div style="font-size:8px;color:${isMe ? 'rgba(255,255,255,0.7)' : 'var(--muted)'};text-align:right;margin-top:4px;font-weight:700">${timeHtml}</div>
          </div>
          <!-- Reply action button -->
          <button class="ib chat-bubble-reply-btn" onclick="app.setChatReply('${safeId}', '${senderName}', '${safeDecodedTextApos}')" style="position:absolute;top:50%;transform:translateY(-50%);${isMe ? 'left:-28px' : 'right:-28px'};width:20px;height:20px;font-size:9px;color:var(--muted);display:none;background:var(--surface);border-radius:50%;border:1px solid var(--border)" title="রিপ্লাই"><i class="fas fa-reply"></i></button>
        </div>
      `;
    }).join('');

    // Trigger hover events or styles for reply buttons
    document.querySelectorAll('.chat-msg-wrapper').forEach(wrap => {
      wrap.addEventListener('mouseenter', () => {
        const btn = wrap.querySelector('.chat-bubble-reply-btn');
        if (btn) btn.style.display = 'flex';
      });
      wrap.addEventListener('mouseleave', () => {
        const btn = wrap.querySelector('.chat-bubble-reply-btn');
        if (btn) btn.style.display = 'none';
      });
    });

    // Auto scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  setChatReply(msgId, sender, text) {
    g('reply-msg-id').value = msgId;
    g('reply-preview-sender').textContent = this.lang === 'bn' ? `${sender} কে রিপ্লাই দিচ্ছেন` : `Replying to ${sender}`;
    g('reply-preview-text').textContent = text;
    g('chat-reply-preview').style.display = 'flex';
    g('chat-input').focus();
  }

  cancelChatReply() {
    g('reply-msg-id').value = '';
    g('chat-reply-preview').style.display = 'none';
  }

  async sendChatMessage() {
    const syncId = this.data.settings.syncId;
    if (!syncId) return;

    const input = g('chat-input');
    const text = input.value.trim();
    if (!text) return;

    const replyId = g('reply-msg-id').value;
    const replyText = g('reply-preview-text').textContent;
    let replySender = g('reply-preview-sender').textContent;
    replySender = replySender.replace(' কে রিপ্লাই দিচ্ছেন', '').replace('Replying to ', '');

    const myInitials = this.data.settings.initials || 'SA';

    // Base64 encode text - MORE compact in URLs for Bengali/emoji
    const encText = (str) => {
      try { return btoa(unescape(encodeURIComponent(str))); }
      catch(e) { return str; }
    };

    const newMsg = {
      id: this.uid(),
      sender: myInitials,
      text: encText(text),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
      replyTo: replyId ? { id: replyId, sender: replySender, text: encText(replyText) } : null
    };

    input.value = '';
    this.cancelChatReply();

    try {
      // 1. Fetch latest messages first to merge
      const res = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/swnr32ym/bk_chat_${syncId}`);
      let msgs = this._parseChatData(res.ok ? await res.text() : '');

      // 2. Append new message
      msgs.push(newMsg);

      // 3. Keep as many messages as possible up to 25 messages, but ensure the payload fits URL limits (~1800 chars)
      if (msgs.length > 25) msgs = msgs.slice(-25);
      
      let payload = encodeURIComponent(JSON.stringify(msgs));
      while (payload.length > 1800 && msgs.length > 1) {
        msgs.shift(); // Remove the oldest message to reduce size
        payload = encodeURIComponent(JSON.stringify(msgs));
      }

      // 4. Save back to server via URL param
      const saveRes = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/swnr32ym/bk_chat_${syncId}?value=${payload}`, {
        method: 'POST',
        body: ''
      });

      if (saveRes.ok) {
        this.renderChatMessages(msgs);
      } else {
        this.toast('বার্তা পাঠানো যায়নি।', 'error');
      }
    } catch (e) {
      console.error("Chat send failed:", e);
      this.toast('বার্তা পাঠানো যায়নি।', 'error');
    }
  }

  switchMessSubtab(tab) {
    this.activeMessSubtab = tab;

    // Show/hide subpages
    g('mess-subpage-summary').style.display = tab === 'summary' ? '' : 'none';
    g('mess-subpage-bazar').style.display = tab === 'bazar' ? '' : 'none';

    // Toggle active tabs
    g('mess-subtab-summary').classList.toggle('active', tab === 'summary');
    g('mess-subtab-bazar').classList.toggle('active', tab === 'bazar');

    // Toggle action buttons
    document.querySelectorAll('.mess-summary-action').forEach(b => b.style.display = tab === 'summary' ? '' : 'none');
    document.querySelectorAll('.mess-bazar-action').forEach(b => b.style.display = tab === 'bazar' ? '' : 'none');

    // Update page headers
    if (tab === 'summary') {
      setText('mess-page-title', this.t('mess_title'));
      setText('mess-page-sub', this.t('mess_sub'));
      this.renderMess();
    } else {
      setText('mess-page-title', this.t('tab_bazar'));
      setText('mess-page-sub', this.t('new_bazar'));
      this.renderBazar();
    }
  }

  // ── TRANSLATIONS (BANGLA / ENGLISH) ──────────────────────────────────
  t(key) {
    const dict = {
      bn: {
        // Navigation
        home: "হোম",
        txs: "লেনদেন",
        accs: "একাউন্ট",
        mess: "মেস",
        chat: "চ্যাট",
        split: "ভাগ",
        transfer: "ট্রান্সফার",
        budget: "বাজেট",
        goals: "লক্ষ্য",
        debts: "ধার",
        reports: "রিপোর্ট",
        quick_add: "যোগ",
        profile: "প্রোফাইল",
        theme_change: "থিম পরিবর্তন",
        lang_change: "ভাষা পরিবর্তন",
        clear_done: "সম্পন্ন মুছুন",
        add_member: "সদস্য যোগ",
        add_expense: "খরচ যোগ",
        group_sync: "গ্রুপ সিঙ্ক",
        refresh: "রিফ্রেশ",
        
        // Month Labels
        m0: "জান", m1: "ফেব", m2: "মার্চ", m3: "এপ্রি", m4: "মে", m5: "জুন",
        m6: "জুল", m7: "আগ", m8: "সেপ", m9: "অক্টো", m10: "নভে", m11: "ডিসে",
        
        // Page titles
        dashboard_title: "📒 ড্যাশবোর্ড",
        transactions_title: "লেনদেন",
        accounts_title: "একাউন্ট",
        mess_title: "🍛 মেস হিসাব",
        mess_sub: "সবার খরচ একসাথে হিসাব রাখুন",
        chat_title: "💬 মেস চ্যাট",
        split_title: "খরচ ভাগ",
        budget_title: "বাজেট",
        goals_title: "লক্ষ্য ও সঞ্চয়",
        debts_title: "ধার-দেনা",
        reports_title: "রিপোর্ট",
        
        // Sub-tabs
        tab_summary: "📊 মেস হিসাব",
        tab_bazar: "🛒 বাজার লিস্ট",
        tab_active_splits: "চলতি হিসাব",
        tab_settled_splits: "পরিশোধিত",
        tab_active_goals: "চলতি লক্ষ্য",
        tab_settled_goals: "অর্জিত লক্ষ্য",
        tab_active_debts: "বকেয়া দেনা",
        tab_settled_debts: "পরিশোধিত দেনা",
        
        // Dynamic labels & placeholders
        search_placeholder: "বিবরণ বা ক্যাটাগরি খুঁজুন...",
        write_msg_placeholder: "বার্তা লিখুন...",

        // Dashboard Cards
        tot_bal: "মোট ব্যালেন্স",
        all_acc: "সব একাউন্ট",
        mess_exp: "এ মাসে মেস খরচ",
        act_debt: "বকেয়া ধার",
        exp_breakdown: "খরচের হিসাব",
        trend_6m: "৬ মাসের ট্রেন্ড",
        fin_health: "আর্থিক সুস্বাস্থ্য",
        score_lbl: "তোমার স্কোর",
        smart_tip: "স্মার্ট পরামর্শ",
        recent_tx: "সাম্প্রতিক লেনদেন",
        view_all: "সব দেখুন",
        per_head: "জন প্রতি",
        add_member_lbl: "সদস্য যোগ করুন",
        income_lbl: "আয়",
        expense_lbl: "খরচ",
        inc_vs_exp: "আয় বনাম খরচ",

        // Forms & Table Headers
        to_acc: "প্রতি একাউন্ট",
        desc: "বিবরণ",
        desc_ph: "কিসের জন্য?",
        amount_lbl: "পরিমাণ (৳)",
        date: "তারিখ",
        notes_lbl: "নোট (ঐচ্ছিক)",
        notes_ph: "অতিরিক্ত বিবরণ...",
        tag_lbl: "ট্যাগ (Enter চাপুন)",
        tag_ph: "#মেস #বাজার",
        rec_tx: "পুনরাবৃত্তি লেনদেন",
        freq_monthly: "মাসিক",
        freq_weekly: "সাপ্তাহিক",
        freq_yearly: "বার্ষিক",
        add_tx_btn: "লেনদেন যোগ করুন",
        accounts_heading: "একাউন্ট সমূহ",
        accounts_sub: "টাকার হিসাব রাখুন",
        new_acc_btn: "নতুন একাউন্ট",
        this_month: "এ মাসে",
        no_members: "কোনো সদস্য নেই। সদস্য যোগ করুন।",
        expense_type_sub: "কোন খরচ কত",
        no_mess_exp: "কোনো মেস খরচ নেই",
        total_items: "মোট আইটেম",
        bought_items: "কেনা হয়েছে",
        bfilter_pending: "বাকি",
        bfilter_done: "কেনা",
        bfilter_all: "সব",
        empty_bazar: "বাজার লিস্ট খালি। আইটেম যোগ করুন।",
        new_bazar: "নতুন আইটেম যোগ",
        item_name: "পণ্যের নাম",
        qty: "পরিমাণ",
        priority: "গুরুত্ব",
        urgent: "জরুরি",
        needed: "দরকার",
        later: "পরে",
        add_item: "যোগ করুন",
        chat_title: "💬 মেস গ্রুপ চ্যাট",
        chat_sub: "রুমমেটদের সাথে রিয়েল-টাইম আলোচনা করুন",
        no_sync: "গ্রুপ সিঙ্ক অন নেই",
        no_sync_desc: "চ্যাট ব্যবহার করতে প্রথমে আপনার মেস কোড দিয়ে গ্রুপ সিঙ্কে যুক্ত হতে হবে।",
        turn_on_sync: "গ্রুপ সিঙ্ক অন করুন",
        split_title: "💸 খরচ ভাগ",
        split_sub: "বন্ধুদের সাথে খরচ ভাগ করুন",
        new_split: "নতুন ভাগ",
        active_splits: "সক্রিয় ভাগ সমূহ",
        active_splits_sub: "যে খরচ এখনো মেটানো হয়নি",
        personal_analysis: "ব্যক্তিগত বিশ্লেষণ",
        no_tx_data: "কোনো লেনদেনের তথ্য নেই",
        all_types: "সব ধরন",
        all_cats: "সব ক্যাটাগরি",
        no_tx: "কোনো লেনদেন নেই",
        new_tx: "নতুন লেনদেন",
        tx_form_sub: "আয় বা খরচ লিখুন",
        deposit: "জমা",
        personal_exp: "ব্যক্তিগত খরচ",
        surplus: "জমা আছে",
        deficit: "জমা দেবে",
        settled: "হিসাব সমান",
        deposit_to_fund: "তহবিলে জমা",
        no_accounts: "কোনো একাউন্ট নেই",
        category: "ক্যাটাগরি",
        account: "একাউন্ট",
        amount: "পরিমাণ",
        actions: "কাজ",
        paid_by: "দেওয়া হয়েছে",
        acc_name: "\u098f\u0995\u09be\u098b\u09a8\u09cd\u099f\u09c7\u09b0 \u09a8\u09be\u09ae",
        acc_name_ph: "\u09af\u09c7\u09ae\u09a8: bKash, \u09ac\u09cd\u09af\u09be\u0982\u0995",
        acc_type: "\u098f\u0995\u09be\u098b\u09a8\u09cd\u099f\u09c7\u09b0 \u09a7\u09b0\u09a8",
        acc_type_cash: "\ud83d\udcb5 \u09a8\u0997\u09a6 \u099f\u09be\u0995\u09be",
        acc_type_bank: "\ud83c\udfe6 \u09ac\u09cd\u09af\u09be\u0982\u0995",
        acc_type_bkash: "\ud83d\udcf1 \u09ac\u09bf\u0995\u09be\u09b6",
        acc_type_nagad: "\ud83d\udcf1 \u09a8\u0997\u09a6",
        acc_type_rocket: "\ud83d\udcf1 \u09b0\u0995\u09c7\u099f",
        acc_type_card: "\ud83d\udc33 \u0995\u09cd\u09b0\u09c7\u09a1\u09bf\u099f \u0995\u09be\u09b0\u09cd\u09a1",
        acc_type_savings: "\ud83d\udc37 \u09b8\u0982\u099a\u09af\u09bc",
        acc_type_other: "\ud83d\udcc1 \u0985\u09a8\u09cd\u09af\u09be\u09a8\u09cd\u09af",
        save: "\u09b8\u0982\u09b0\u0995\u09cd\u09b7\u09a3",
        mess_summary: "মেস সারসংক্ষেপ",
        total_expense: "মোট খরচ",
        mess_fund: "মেস তহবিল",
        members: "সদস্য",
        expense_type: "খরচের ধরন",
        expense_list: "খরচের তালিকা",
        // Page sub-sections - Split Bill
        active_splits: "সক্রিয় ভাগ সমূহ",
        active_splits_sub: "যে খরচ এখনো মেটানো হয়নি",
        settled_sub: "যে খরচ মিটে গেছে",
        no_splits: "কোনো ভাগ নেই",
        no_settled_splits: "কোনো সম্পন্ন ভাগ নেই",
        new_split: "নতুন ভাগ",

        // Budget
        budget_mgr: "বাজেট ম্যানেজার",
        budget_mgr_sub: "মাসিক খরচের সীমা নির্ধারণ",
        set_budget: "বাজেট সেট",
        cat_budget: "ক্যাটাগরি বাজেট",
        budget_chart_title: "বাজেটের চিত্র",
        expense_dist: "খরচের বিতরণ",
        total_budget: "মোট বাজেট",
        total_spent: "মোট খরচ",
        no_budget: "কোনো বাজেট নেই। বাজেট সেট করুন।",

        // Goals
        goals_sub: "আর্থিক লক্ষ্য নির্ধারণ করুন",
        new_goal: "নতুন লক্ষ্য",
        no_goals: "কোনো লক্ষ্য নেই। এখনই শুরু করুন!",
        create_goal: "লক্ষ্য তৈরি",

        // Debts
        debts_mgr: "ধার-দেনার হিসাব",
        debts_sub: "কে কাকে ধার দিলো",
        new_debt: "নতুন ধার",
        i_owe_title: "আমি ধার নিয়েছি",
        i_owe_sub: "যা ফেরত দিতে হবে",
        no_i_owe: "কারোর কাছে ধার নেই!",
        they_owe_title: "আমি ধার দিয়েছি",
        they_owe_sub: "যা ফেরত পাওয়ার কথা",
        no_they_owe: "কেউ আপনার কাছে ধার নেয়নি",

        // Reports
        reports_title_full: "রিপোর্ট ও বিশ্লেষণ",
        reports_sub: "বিস্তারিত আর্থিক চিত্র",
        csv_download: "CSV ডাউনলোড",
        total_income: "মোট আয়",
        total_expense_lbl: "মোট খরচ",
        save_rate: "সঞ্চয়ের হার",
        tx_count_lbl: "লেনদেন সংখ্যা",
        monthly_inc_exp: "মাসিক আয় বনাম খরচ",
        last_12m: "গত ১২ মাস",
        exp_category: "খরচের ক্যাটাগরি",
        all_time: "সর্বকালীন",
        tx_calendar: "📅 লেনদেন ক্যালেন্ডার",
        top_cat_title: "শীর্ষ খরচের ক্যাটাগরি",
        spending_pattern: "খরচের ধারা"
      },
      en: {
        // Navigation
        home: "Home",
        txs: "Txns",
        accs: "Accounts",
        mess: "Mess",
        chat: "Chat",
        split: "Split",
        transfer: "Transfer",
        budget: "Budget",
        goals: "Goals",
        debts: "Debts",
        reports: "Reports",
        quick_add: "Add",
        profile: "Profile",
        theme_change: "Change Theme",
        lang_change: "Change Language",
        clear_done: "Clear Done",
        add_member: "Add Member",
        add_expense: "Add Expense",
        group_sync: "Group Sync",
        refresh: "Refresh",
        
        // Month Labels
        m0: "Jan", m1: "Feb", m2: "Mar", m3: "Apr", m4: "May", m5: "Jun",
        m6: "Jul", m7: "Aug", m8: "Sep", m9: "Oct", m10: "Nov", m11: "Dec",
        
        // Page titles
        dashboard_title: "📒 Dashboard",
        transactions_title: "Transactions",
        accounts_title: "Accounts",
        mess_title: "🍛 Mess Summary",
        mess_sub: "Keep track of all mess expenses",
        chat_title: "💬 Mess Chat",
        split_title: "Split Bill",
        budget_title: "Budget",
        goals_title: "Goals & Savings",
        debts_title: "Debts & Loans",
        reports_title: "Reports",
        
        // Sub-tabs
        tab_summary: "📊 Mess Summary",
        tab_bazar: "🛒 Bazar List",
        tab_active_splits: "Active",
        tab_settled_splits: "Settled",
        tab_active_goals: "Active Goals",
        tab_settled_goals: "Achieved Goals",
        tab_active_debts: "Debts",
        tab_settled_debts: "Settled Debts",
        
        // Dynamic labels & placeholders
        search_placeholder: "Search details or category...",
        write_msg_placeholder: "Type a message...",

        // Dashboard Cards
        tot_bal: "Total Balance",
        all_acc: "All Accounts",
        mess_exp: "Monthly Mess Expense",
        act_debt: "Active Debts",
        exp_breakdown: "Expense Breakdown",
        trend_6m: "6-Month Trend",
        fin_health: "Financial Health",
        score_lbl: "Your Score",
        smart_tip: "Smart Advice",
        recent_tx: "Recent Transactions",
        view_all: "View All",
        per_head: "Per head",
        add_member_lbl: "Add member",
        income_lbl: "Income",
        expense_lbl: "Expense",
        inc_vs_exp: "Income vs Expense",

        // Forms & Table Headers
        to_acc: "To Account",
        desc: "Description",
        desc_ph: "What is this for?",
        amount_lbl: "Amount (৳)",
        date: "Date",
        notes_lbl: "Notes (Optional)",
        notes_ph: "Additional details...",
        tag_lbl: "Tags (Press Enter)",
        tag_ph: "#mess #bazar",
        rec_tx: "Recurring Transaction",
        freq_monthly: "Monthly",
        freq_weekly: "Weekly",
        freq_yearly: "Yearly",
        add_tx_btn: "Add Transaction",
        accounts_heading: "Accounts List",
        accounts_sub: "Keep track of your wallets",
        new_acc_btn: "New Account",
        this_month: "this month",
        no_members: "No members found. Add members.",
        expense_type_sub: "Categorized expenses",
        no_mess_exp: "No mess expenses found",
        total_items: "Total Items",
        bought_items: "Bought",
        bfilter_pending: "Pending",
        bfilter_done: "Bought",
        bfilter_all: "All",
        empty_bazar: "Bazar list is empty. Add items.",
        new_bazar: "Add New Item",
        item_name: "Item Name",
        qty: "Quantity",
        priority: "Priority",
        urgent: "Urgent",
        needed: "Needed",
        later: "Later",
        add_item: "Add Item",
        chat_title: "💬 Mess Group Chat",
        chat_sub: "Discuss with roommates in real-time",
        no_sync: "Group Sync Offline",
        no_sync_desc: "Join group sync using your mess code first to use chat.",
        turn_on_sync: "Turn on Sync",
        split_title: "💸 Split Bill",
        split_sub: "Split expenses easily among roommates",
        new_split: "New Split",
        active_splits: "Active Bills",
        active_splits_sub: "Expenses not settled yet",
        personal_analysis: "Personal Analysis",
        no_tx_data: "No transaction data available",
        all_types: "All Types",
        all_cats: "All Categories",
        no_tx: "No transactions found",
        new_tx: "New Transaction",
        tx_form_sub: "Enter income or expense",
        deposit: "Deposit",
        personal_exp: "Personal Exp",
        surplus: "Surplus",
        deficit: "Owes",
        settled: "Settled",
        deposit_to_fund: "Deposit to Fund",
        no_accounts: "No accounts found",
        category: "Category",
        account: "Account",
        amount: "Amount",
        actions: "Actions",
        paid_by: "Paid By",
        acc_name: "Account Name",
        acc_name_ph: "e.g. bKash, Bank",
        acc_type: "Account Type",
        acc_type_cash: "💵 Cash",
        acc_type_bank: "🏦 Bank",
        acc_type_bkash: "📱 bKash",
        acc_type_nagad: "📱 Nagad",
        acc_type_rocket: "📱 Rocket",
        acc_type_card: "💳 Credit Card",
        acc_type_savings: "🐷 Savings",
        acc_type_other: "📂 Others",
        save: "Save",
        mess_summary: "Mess Summary",
        total_expense: "Total Expense",
        mess_fund: "Mess Fund",
        members: "Members",
        expense_type: "Expense Type",
        expense_list: "Expense List",
        // Page sub-sections - Split Bill
        active_splits: "Active Bills",
        active_splits_sub: "Expenses not settled yet",
        settled_sub: "Expenses that have been settled",
        no_splits: "No active splits",
        no_settled_splits: "No settled splits",
        new_split: "New Split",

        // Budget
        budget_mgr: "Budget Manager",
        budget_mgr_sub: "Set monthly spending limits",
        set_budget: "Set Budget",
        cat_budget: "Category Budget",
        budget_chart_title: "Budget Chart",
        expense_dist: "Expense Distribution",
        total_budget: "Total Budget",
        total_spent: "Total Spent",
        no_budget: "No budget set. Set a budget.",

        // Goals
        goals_sub: "Set your financial goals",
        new_goal: "New Goal",
        no_goals: "No goals yet. Start now!",
        create_goal: "Create Goal",

        // Debts
        debts_mgr: "Debts & Loans",
        debts_sub: "Who owes who",
        new_debt: "New Debt",
        i_owe_title: "I Borrowed",
        i_owe_sub: "Money I need to return",
        no_i_owe: "You don't owe anyone!",
        they_owe_title: "I Lent",
        they_owe_sub: "Money owed to me",
        no_they_owe: "Nobody owes you anything",

        // Reports
        reports_title_full: "Reports & Analysis",
        reports_sub: "Detailed financial overview",
        csv_download: "CSV Download",
        total_income: "Total Income",
        total_expense_lbl: "Total Expense",
        save_rate: "Savings Rate",
        tx_count_lbl: "Transactions",
        monthly_inc_exp: "Monthly Income vs Expense",
        last_12m: "Last 12 months",
        exp_category: "Expense Category",
        all_time: "All Time",
        tx_calendar: "📅 Transaction Calendar",
        top_cat_title: "Top Expense Categories",
        spending_pattern: "Spending Pattern"
      }
    };
    return dict[this.lang]?.[key] || key;
  }

  resolveLegacyCat(cat) {
    const legacyMap = {
      'cat_bazar': 'বাজার',
      'cat_gas': 'গ্যাস',
      'cat_elec': 'বিদ্যুৎ',
      'cat_water': 'পানি',
      'cat_wifi': 'ওয়াইফাই',
      'cat_rent': 'বাসা ভাড়া',
      'cat_maid': 'বুয়া/খালা',
      'cat_cook': 'রান্না',
      'cat_clean': 'পরিষ্কার',
      'cat_other': 'অন্যান্য',
      'বাজার': 'বাজার',
      'গ্যাস': 'গ্যাস',
      'বিদ্যুৎ': 'বিদ্যুৎ',
      'পানি': 'পানি',
      'ওয়াইফাই': 'ওয়াইফাই',
      'বাসা ভা঱া': 'বাসা ভাড়া',
      'বুয়া/খালা': 'বুয়া/খালা',
      'রান্না': 'রান্না',
      'পরিষ্কার': 'পরিষ্কার',
      'অন্যান্য': 'অন্যান্য'
    };
    return legacyMap[cat] || cat;
  }

  updateSubcatDropdown(cat, selectedVal = '') {
    const subcatG = g('me-subcat-g');
    const subcatSelect = g('me-subcat');
    if (!subcatG || !subcatSelect) return;

    const resolvedCat = this.resolveLegacyCat(cat);
    
    // We support subcategories if we have list defined in this.data.mess.subcategories
    const list = this.data.mess.subcategories?.[resolvedCat];
    if (list) {
      subcatG.style.display = '';
      subcatSelect.innerHTML = `<option value="">--- নির্বাচন করুন (ঐচ্ছিক) ---</option>` +
        list.map(s => `<option value="${s}">${s}</option>`).join('');
      subcatSelect.value = selectedVal;
      this.updateSubcatDeleteButton();
    } else {
      subcatG.style.display = 'none';
      subcatSelect.innerHTML = '';
      const delBtn = g('me-del-subcat-btn');
      if (delBtn) delBtn.style.display = 'none';
    }
  }

  updateSubcatDeleteButton() {
    const subcatSelect = g('me-subcat');
    const delBtn = g('me-del-subcat-btn');
    if (!subcatSelect || !delBtn) return;
    
    const val = subcatSelect.value;
    if (val && val !== "") {
      delBtn.style.display = '';
    } else {
      delBtn.style.display = 'none';
    }
  }

  handleAddSubcat() {
    const cat = this.resolveLegacyCat(g('me-cat').value);
    if (!cat) return;
    
    const newSubcat = prompt('নতুন উপ-ক্যাটাগরির নাম লিখুন:');
    if (!newSubcat) return;
    const trimmed = newSubcat.trim();
    if (!trimmed) return;
    
    this.data.mess.subcategories = this.data.mess.subcategories || {};
    this.data.mess.subcategories[cat] = this.data.mess.subcategories[cat] || [];
    
    if (this.data.mess.subcategories[cat].includes(trimmed)) {
      this.toast('এই উপ-ক্যাটাগরি ইতিমধ্যে রয়েছে!', 'error');
      return;
    }
    
    this.data.mess.subcategories[cat].push(trimmed);
    this.save('mess');
    this.toast('নতুন উপ-ক্যাটাগরি যোগ হয়েছে!', 'success');
    this.updateSubcatDropdown(cat, trimmed);
  }

  handleDeleteSubcat() {
    const cat = this.resolveLegacyCat(g('me-cat').value);
    const subcatSelect = g('me-subcat');
    if (!cat || !subcatSelect) return;
    
    const val = subcatSelect.value;
    if (!val) return;
    
    if (!confirm(`"${val}" উপ-ক্যাটাগরির নাম মুছে ফেলতে চান?`)) return;
    
    this.data.mess.subcategories = this.data.mess.subcategories || {};
    if (this.data.mess.subcategories[cat]) {
      this.data.mess.subcategories[cat] = this.data.mess.subcategories[cat].filter(s => s !== val);
      this.save('mess');
      this.toast('উপ-ক্যাটাগরি মুছে ফেলা হয়েছে!', 'info');
      this.updateSubcatDropdown(cat, '');
    }
  }

  tCat(cat) {
    const resolvedCat = this.resolveLegacyCat(cat);
    if (this.lang === 'bn') return resolvedCat;
    const catMap = {
      // Mess Categories
      'মেস': 'Mess',
      'বাজার': 'Bazar',
      'ওয়াইফাই বিল': 'WiFi Bill',
      'বাসা ভাড়া': 'Rent',
      'বুয়া/খালা বিল': 'Maid Bill',
      'অন্যান্য': 'Others',
      'গ্যাস বিল': 'Gas Bill',
      'বিদ্যুৎ বিল': 'Electricity Bill',
      'पानी बिल': 'Water Bill',

      // Dashboard Categories
      'খাবার': 'Food',
      'রুম ভাড়া': 'Room Rent',
      'মোবাইল রিচার্জ': 'Mobile Recharge',
      'ইন্টারনেট': 'Internet',
      'যাতায়াত': 'Transport',
      'পড়াশোনা': 'Education',
      'বই/ফটোকপি': 'Books/Copies',
      'ওষুধ': 'Medicine',
      'পোশাক': 'Clothing',
      'বিনোদন': 'Entertainment',
      'সেলুন': 'Salon',
      'চা/নাস্তা': 'Tea & Snacks',
      'রেস্তোরাঁ': 'Restaurant',
      'বেতন/বৃত্তি': 'Salary/Stipend',
      'ফ্রিল্যান্স': 'Freelance',
      'পার্টটাইম': 'Part-time',
      'পারিবারিক': 'Family',
      'বোনাস': 'Bonus',
      'অন্যান্য আয়': 'Other Income',
      'ট্রান্সফার': 'Transfer'
    };
    return catMap[resolvedCat] || resolvedCat;
  }

  tAccName(name) {
    if (this.lang === 'bn') return name;
    const m = {
      'নগদ': 'Cash',
      'বিকাশ': 'bKash',
      'ব্যাংক': 'Bank'
    };
    return m[name] || name;
  }

  translatePage() {
    // 1. Translate elements with .i18n class
    if (this.lang !== 'bn') {
      document.querySelectorAll('.i18n').forEach(el => {
        const key = el.dataset.key;
        const text = this.t(key);
        if (text && text !== key) {
          const icon = el.querySelector('i');
          if (icon) {
            el.innerHTML = '';
            el.appendChild(icon);
            el.appendChild(document.createTextNode(' ' + text));
          } else {
            el.textContent = text;
          }
        }
      });
    }

    // 2. Update language toggle pill — highlight the ACTIVE language
    const enLabel = g('lang-en-label');
    const bnLabel = g('lang-bn-label');
    if (enLabel && bnLabel) {
      const activeStyle = 'background:var(--p);color:#fff;box-shadow:0 1px 4px rgba(0,0,0,.3)';
      const inactiveStyle = 'background:transparent;color:var(--muted)';
      if (this.lang === 'en') {
        enLabel.style.cssText += ';' + activeStyle;
        bnLabel.style.cssText += ';' + inactiveStyle;
        enLabel.style.background = 'var(--p)';
        enLabel.style.color = '#fff';
        enLabel.style.boxShadow = '0 1px 4px rgba(0,0,0,.3)';
        bnLabel.style.background = 'transparent';
        bnLabel.style.color = 'var(--muted)';
        bnLabel.style.boxShadow = 'none';
      } else {
        bnLabel.style.background = 'var(--p)';
        bnLabel.style.color = '#fff';
        bnLabel.style.boxShadow = '0 1px 4px rgba(0,0,0,.3)';
        enLabel.style.background = 'transparent';
        enLabel.style.color = 'var(--muted)';
        enLabel.style.boxShadow = 'none';
      }
    }
    // Legacy fallback (if old button still exists)
    const langBtn = g('lang-toggle');
    if (langBtn && langBtn.tagName === 'BUTTON') {
      langBtn.textContent = this.lang === 'bn' ? 'EN' : 'বাং';
    }

    // 3. Update buttons innerHTML with icons
    const qAdd = g('quick-add-btn');
    if (qAdd) qAdd.innerHTML = `<i class="fas fa-plus"></i> ${this.t('quick_add')}`;
    
    const mSync = g('mess-sync-btn');
    if (mSync) mSync.innerHTML = `<i class="fas fa-cloud"></i> ${this.t('group_sync')}`;
    
    const mAddMem = g('add-mess-member-btn');
    if (mAddMem) mAddMem.innerHTML = `<i class="fas fa-user-plus"></i> ${this.t('add_member')}`;
    
    const mAddExp = g('add-mess-entry-btn');
    if (mAddExp) mAddExp.innerHTML = `<i class="fas fa-plus"></i> ${this.t('add_expense')}`;
    
    const bClr = g('clear-done-btn');
    if (bClr) bClr.innerHTML = `<i class="fas fa-broom"></i> ${this.t('clear_done')}`;
    
    const cRef = g('chat-refresh-btn');
    if (cRef) cRef.innerHTML = `<i class="fas fa-rotate"></i> ${this.t('refresh')}`;

    const chatSync = g('chat-turn-on-sync-btn');
    if (chatSync) chatSync.innerHTML = `<i class="fas fa-link"></i> ${this.t('turn_on_sync')}`;

    // 4. Translate sub-tabs
    const subSummary = g('mess-subtab-summary');
    if (subSummary) subSummary.textContent = this.t('tab_summary');
    const subBazar = g('mess-subtab-bazar');
    if (subBazar) subBazar.textContent = this.t('tab_bazar');

    // 5. Placeholders
    const searchInp = g('t-search');
    if (searchInp) searchInp.placeholder = this.t('search_placeholder');
    const chatInp = g('chat-input');
    if (chatInp) chatInp.placeholder = this.t('write_msg_placeholder');

    const descInp = g('f-title');
    if (descInp) descInp.placeholder = this.t('desc_ph');
    const notesInp = g('f-notes');
    if (notesInp) notesInp.placeholder = this.t('notes_ph');
    const tagInp = g('tag-inp');
    if (tagInp) tagInp.placeholder = this.t('tag_ph');

    const bzName = g('bz-name');
    if (bzName) bzName.placeholder = this.lang === 'bn' ? 'যেমন: চাল, ডাল, তেল' : 'e.g. Rice, Lentils, Oil';
    const bzQty = g('bz-qty');
    if (bzQty) bzQty.placeholder = this.lang === 'bn' ? 'যেমন: ৫ কেজি, ৩টি (ঐচ্ছিক)' : 'e.g. 5 kg, 3 pcs (optional)';

    const accName = g('acc-name');
    if (accName) accName.placeholder = this.t('acc_name_ph');

    // 6. Update Month Tabs text dynamically
    const monthNamesBN = ['জান', 'ফেব', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুল', 'আগ', 'সেপ', 'অক্টো', 'নভে', 'ডিসে'];
    const monthNamesEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const activeNames = this.lang === 'bn' ? monthNamesBN : monthNamesEN;
    document.querySelectorAll('.mtab').forEach(tab => {
      const mIdx = parseInt(tab.dataset.month);
      if (!isNaN(mIdx) && activeNames[mIdx]) {
        tab.textContent = activeNames[mIdx];
      }
    });

    // 7. Update tooltips
    const pInit = g('profile-initials');
    if (pInit) pInit.title = this.t('profile');
    const tTog = g('theme-toggle');
    if (tTog) tTog.title = this.t('theme_change');

    // 8. Dynamic page-specific title updates on language change
    if (this.page === 'mess') {
      const tab = this.activeMessSubtab || 'summary';
      if (tab === 'summary') {
        setText('mess-page-title', this.t('mess_title'));
        setText('mess-page-sub', this.t('mess_sub'));
      } else {
        setText('mess-page-title', this.t('tab_bazar'));
        setText('mess-page-sub', this.t('new_bazar'));
      }
    }

    // 9. Update navigation buttons tooltips
    document.querySelectorAll('.nbtn').forEach(b => {
      const page = b.dataset.page;
      if (page) {
        const titleKey = `${page}_title`;
        b.title = this.t(titleKey);
      }
    });
  }
}

// ── HELPERS ─────────────────────────────────────────────────────
function g(id) { return document.getElementById(id); }
function setText(id, val) { const el=g(id); if(el) el.textContent=val; }
function getMuted() { return getComputedStyle(document.documentElement).getPropertyValue('--muted').trim()||'#888'; }

// ── LAUNCH ──────────────────────────────────────────────────────
const app = new BachelorKhata();
