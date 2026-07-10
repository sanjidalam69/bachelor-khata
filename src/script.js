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
    if (!this.data.mess.members) this.data.mess = { members: [], entries: [] };

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
    this.checkResponsive();
    window.addEventListener('resize', () => this.checkResponsive());
    const today = new Date().toISOString().split('T')[0];
    ['f-date','q-date','me-date','sp-date'].forEach(id => { const el = g(id); if(el) el.value = today; });
    this.bindSync();
    if(this.data.settings.syncId) {
      this.cloudDownload().catch(err => console.error("Initial sync error:", err));
    }
    this.render();
  }

  checkResponsive() {
    const isMob = window.innerWidth <= 640;
    const mobLogo = g('mob-logo');
    const themeMob = g('theme-toggle-mob');
    if (mobLogo) mobLogo.style.display = isMob ? 'flex' : 'none';
    if (themeMob) themeMob.style.display = isMob ? 'flex' : 'none';
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
      dashboard:'📒 ড্যাশবোর্ড',transactions:'লেনদেন',accounts:'একাউন্ট',
      mess:'মেস হিসাব',bazar:'বাজার লিস্ট',split:'খরচ ভাগ',
      budget:'বাজেট',goals:'লক্ষ্য ও সঞ্চয়',debts:'ধার-দেনা',reports:'রিপোর্ট'
    };
    setText('page-title', titles[page] || page);
    this.renderPage(page);
  }

  renderPage(p) {
    if (p==='dashboard') this.renderDash();
    else if (p==='transactions') this.renderTx();
    else if (p==='accounts') this.renderAccounts();
    else if (p==='mess') this.renderMess();
    else if (p==='bazar') this.renderBazar();
    else if (p==='split') this.renderSplits();
    else if (p==='budget') this.renderBudget();
    else if (p==='goals') this.renderGoals();
    else if (p==='debts') this.renderDebts();
    else if (p==='reports') this.renderReports();
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
  fmt(n) { return '৳' + Math.round(n||0).toLocaleString('en-BD'); }
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
  EXPENSE_CATS = ['মেস/খাবার','বাজার','রুম ভাড়া','বিদ্যুৎ বিল','মোবাইল রিচার্জ','ইন্টারনেট','যাতায়াত','পড়াশোনা','বই/ফটোকপি','ওষুধ','পোশাক','বিনোদন','লন্ড্রি','সেলুন','চা/নাস্তা','রেস্তোরাঁ','অন্যান্য'];

  fillCat(id, type) {
    const el = g(id); if (!el) return;
    const cats = type==='income' ? this.INCOME_CATS : this.EXPENSE_CATS;
    el.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  fillAcc(id, excludeId=null) {
    const el = g(id); if (!el) return;
    el.innerHTML = this.data.accounts.map(a => `<option value="${a.id}" ${a.id===excludeId?'disabled':''}>${this.accIcon(a.type)} ${a.name}</option>`).join('');
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

  closeModal(id) { g(id)?.classList.remove('open'); }

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
      el.innerHTML='<option value="mess-fund">📦 মেস তহবিল (ক্যাশ বাক্স)</option>'+this.data.mess.members.map(m=>`<option value="${m.id}">${m.name}</option>`).join('');
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
          g('me-cat').value=e.category||'অন্যান্য';
        }
      }
    }
    else {
      this.toggleMessEntryType('expense');
      g('me-title').value='';
      g('me-amount').value='';
      g('me-date').value=new Date().toISOString().split('T')[0];
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
      if(!title||!amount||!payerId){this.toast('সব ঘর পূরণ করুন।','error');return;}
      const entry={id:id||this.uid(),type:'expense',title,amount,date,payerId,category:cat};
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
    const name=g('bz-name').value.trim(); const qty=g('bz-qty').value.trim(); const price=parseFloat(g('bz-price').value)||0; const prio=g('bz-prio').value;
    if(!name){this.toast('পণ্যের নাম দিন।','error');return;}
    this.data.bazar.push({id:this.uid(),name,qty,price,prio,done:false,addedAt:new Date().toISOString()});
    this.save('bazar'); g('bz-name').value=''; g('bz-qty').value=''; g('bz-price').value=''; this.toast(`${name} যোগ হয়েছে!`,'success'); this.renderBazar();
  }

  toggleBazar(id) {
    this.data.bazar=this.data.bazar.map(b=>b.id===id?{...b,done:!b.done}:b); this.save('bazar'); this.renderBazar();
  }

  openBazarEdit(id) {
    const item=this.data.bazar.find(b=>b.id===id); if(!item) return;
    g('baz-id').value=id; g('baz-name').value=item.name; g('baz-qty').value=item.qty||''; g('baz-price').value=item.price||'';
    this.openModal('m-bazar');
  }

  saveBazarEdit() {
    const id=g('baz-id').value; if(!id) return;
    const name=g('baz-name').value.trim(); const qty=g('baz-qty').value.trim(); const price=parseFloat(g('baz-price').value)||0;
    this.data.bazar=this.data.bazar.map(b=>b.id===id?{...b,name,qty,price}:b);
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
    setText('d-acc-count',`${this.data.accounts.length}টি`);

    // Mess stats
    const messTx=this.data.mess.entries.filter(e=>{const d=new Date(e.date);return d.getUTCMonth()===this.month&&d.getUTCFullYear()===this.year;});
    const messTotal=messTx.reduce((s,e)=>s+e.amount,0);
    const memberCount=this.data.mess.members.length;
    setText('d-mess-total',this.fmt(messTotal));
    setText('d-mess-pp',memberCount>0?`জন প্রতি ${this.fmt(messTotal/memberCount)}`:'সদস্য যোগ করুন');

    // Debts
    const activeDebts=this.data.debts.filter(d=>!d.settled);
    setText('d-debt-total',this.fmtK(activeDebts.reduce((s,d)=>s+d.amount,0)));
    setText('d-debt-count',`${activeDebts.length}টি`);

    const months=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
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
    const m={'মেস/খাবার':'🍛','বাজার':'🛒','রুম ভাড়া':'🏠','বিদ্যুৎ বিল':'💡','মোবাইল রিচার্জ':'📱','ইন্টারনেট':'📶','যাতায়াত':'🚗','পড়াশোনা':'📚','বই/ফটোকপি':'📑','ওষুধ':'💊','পোশাক':'👔','বিনোদন':'🎮','লন্ড্রি':'👕','সেলুন':'✂️','চা/নাস্তা':'☕','রেস্তোরাঁ':'🍽️','অন্যান্য':'📂','বেতন/বৃত্তি':'💰','ফ্রিল্যান্স':'💻','পার্টটাইম':'⏰','পারিবারিক':'👨‍👩‍👦','বোনাস':'🎁','অন্যান্য আয়':'💵','ট্রান্সফার':'⇄','Transfer':'⇄'};
    return m[cat]||'📂';
  }

  renderCatChart(mTx) {
    const cats={}; mTx.filter(t=>t.type==='expense').forEach(t=>{cats[t.category]=(cats[t.category]||0)+t.amount;});
    const labels=Object.keys(cats); const data=Object.values(cats);
    const COLORS=['#f97316','#f43f5e','#10b981','#f59e0b','#3b82f6','#a855f7','#06b6d4','#ec4899','#14b8a6','#ef4444'];
    if(this.charts.cat)this.charts.cat.destroy();
    const ctx=g('cat-chart'); if(!ctx) return;
    const muted=getMuted();
    if(!labels.length){this.charts.cat=new Chart(ctx,{type:'doughnut',data:{labels:['কোনো খরচ নেই'],datasets:[{data:[1],backgroundColor:['rgba(255,255,255,.05)'],borderColor:'transparent',borderWidth:0}]},options:{cutout:'78%',plugins:{legend:{display:false},tooltip:{enabled:false}}}});return;}
    this.charts.cat=new Chart(ctx,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:COLORS,borderColor:'transparent',borderWidth:0,hoverOffset:6}]},options:{cutout:'78%',responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'},padding:8,usePointStyle:true}},tooltip:{callbacks:{label:c=>`${c.label}: ${this.fmt(c.parsed)}`}}}}});
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

    const now=new Date(); const labels=[],incomes=[],expenses=[];
    const mBn=['জান','ফেব','মার্চ','এপ্রি','মে','জুন','জুল','আগ','সেপ','অক্টো','নভে','ডিসে'];
    for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);labels.push(mBn[d.getMonth()]);const tx=this.txForMonth(d.getMonth(),d.getFullYear());incomes.push(tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));expenses.push(tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));}
    const muted=getMuted();
    this.charts.trend=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'আয়',data:incomes,borderColor:'#10b981',backgroundColor:'rgba(16,185,129,.07)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#10b981',borderWidth:2},{label:'খরচ',data:expenses,borderColor:'#f43f5e',backgroundColor:'rgba(244,63,94,.07)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'#f43f5e',borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'},usePointStyle:true}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${this.fmt(c.parsed.y)}`}}},scales:{x:{grid:{color:'rgba(255,255,255,.03)'},ticks:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'}}},y:{grid:{color:'rgba(255,255,255,.03)'},ticks:{color:muted,font:{size:9,family:'Hind Siliguri'},callback:v=>this.fmtK(v)}}}}});
  }

  renderHealthScore(income,expense) {
    const ctx=g('health-chart'); if(!ctx) return;
    if(this.charts.health)this.charts.health.destroy();

    if (this.data.transactions.length === 0) {
      setText('health-score', '--');
      setText('health-label', 'ডেটা নেই');
      g('health-tips').innerHTML = '<div style="font-size:10px;text-align:center;color:var(--muted);font-family:\'Hind Siliguri\',sans-serif;width:100%;margin-top:10px">লেনদেন যোগ করলে আপনার আর্থিক সুস্বাস্থ্য স্কোর এখানে দেখা যাবে।</div>';
      this.charts.health=new Chart(ctx,{type:'doughnut',data:{datasets:[{data:[0,100],backgroundColor:['transparent','rgba(255,255,255,.05)'],borderColor:'transparent',borderWidth:0,cutout:'78%'}]},options:{responsive:false,plugins:{legend:{display:false},tooltip:{enabled:false}},rotation:-90,circumference:180}});
      return;
    }

    let score=0;
    const sr=income>0?(income-expense)/income:0; score+=Math.min(40,Math.round(sr*40));
    let bs=30; Object.entries(this.data.budgets).forEach(([cat,lim])=>{const sp=this.txForMonth().filter(t=>t.type==='expense'&&t.category===cat).reduce((s,t)=>s+t.amount,0);if(sp>lim)bs-=8;}); score+=Math.max(0,bs);
    if(this.data.goals.length>0)score+=10; const tgs=this.data.goals.reduce((s,g)=>s+g.saved,0);const tgt=this.data.goals.reduce((s,g)=>s+g.target,0);if(tgt>0&&tgs/tgt>0.5)score+=5;
    const hasOD=this.data.debts.filter(d=>!d.settled&&d.due&&new Date(d.due)<new Date()).length>0; if(!hasOD)score+=15;
    score=Math.min(100,Math.max(0,score));
    let label='দুর্বল';let color='#f43f5e';
    if(score>=80){label='চমৎকার';color='#10b981';}else if(score>=60){label='ভালো';color='#3b82f6';}else if(score>=40){label='মোটামুটি';color='#f59e0b';}
    setText('health-score',score); setText('health-label',label);
    this.charts.health=new Chart(ctx,{type:'doughnut',data:{datasets:[{data:[score,100-score],backgroundColor:[color,'rgba(255,255,255,.05)'],borderColor:'transparent',borderWidth:0,cutout:'78%'}]},options:{responsive:false,plugins:{legend:{display:false},tooltip:{enabled:false}},rotation:-90,circumference:180}});
    const tips=[];
    if(sr<0.15)tips.push({t:'আয়ের কমপক্ষে ১৫% সঞ্চয় করার চেষ্টা করো',e:'💡'});
    if(this.data.goals.length===0)tips.push({t:'একটি সঞ্চয়ের লক্ষ্য নির্ধারণ করো',e:'🎯'});
    if(hasOD)tips.push({t:'মেয়াদোত্তীর্ণ ধার পরিশোধ করো',e:'⚠️'});
    if(score>=80)tips.push({t:'দারুণ! এভাবেই চালিয়ে যাও',e:'🏆'});
    g('health-tips').innerHTML=tips.slice(0,2).map(t=>`<div style="display:flex;align-items:center;gap:7px;padding:6px 9px;border-radius:9px;background:var(--surface);font-size:10px;color:var(--text);font-family:'Hind Siliguri',sans-serif"><span>${t.e}</span><span>${t.t}</span></div>`).join('');
  }

  renderInsights(mTx,income,expense) {
    if (this.data.transactions.length === 0) {
      g('insights-list').innerHTML = `<div class="ins" style="justify-content:center;text-align:center;padding:18px 12px"><div style="font-size:12px;font-family:'Hind Siliguri',sans-serif;color:var(--muted)">নতুন লেনদেন যোগ করে বাজেট ও সঞ্চয়ের স্মার্ট পরামর্শ এবং ব্যক্তিগত বিশ্লেষণ শুরু করুন।</div></div>`;
      return;
    }

    const insights=[];
    const today=new Date(); const dim=new Date(today.getFullYear(),today.getMonth()+1,0).getDate(); const dp=today.getDate(); const rem=dim-dp;
    const daily=dp>0?expense/dp:0; const pred=this.totalBal()-daily*rem;
    insights.push({e:'🔮',t:`মাস শেষে সম্ভাব্য ব্যালেন্স: <b>${this.fmt(pred)}</b>`});
    const spDays=new Set(mTx.filter(t=>t.type==='expense').map(t=>t.date)).size;
    insights.push({e:'✨',t:`এই মাসে <b>${dp-spDays}টি</b> খরচমুক্ত দিন`});
    const catT={}; mTx.filter(t=>t.type==='expense').forEach(t=>{catT[t.category]=(catT[t.category]||0)+t.amount;});
    const tc=Object.entries(catT).sort((a,b)=>b[1]-a[1])[0];
    if(tc)insights.push({e:'📊',t:`সর্বোচ্চ খরচ: <b>${tc[0]}</b> — ${this.fmt(tc[1])}`});
    if(income>0){const rate=Math.round(((income-expense)/income)*100);insights.push({e:rate>20?'🎉':rate>0?'👍':'⚠️',t:`সঞ্চয়ের হার: <b>${rate}%</b>`});}
    const mb=[];Object.entries(this.data.budgets).forEach(([cat,lim])=>{const sp=mTx.filter(t=>t.type==='expense'&&t.category===cat).reduce((s,t)=>s+t.amount,0);if(sp>lim*0.8)mb.push(cat);});
    if(mb.length)insights.push({e:'🚨',t:`বাজেট সতর্কতা: ${mb.join(', ')}`});

    // Bachelor-specific insights
    const messTotal=this.data.mess.entries.filter(e=>{const d=new Date(e.date);return d.getUTCMonth()===this.month&&d.getUTCFullYear()===this.year;}).reduce((s,e)=>s+e.amount,0);
    if(messTotal>0&&income>0&&messTotal/income>0.5)insights.push({e:'🍛',t:'মেসের খরচ আয়ের ৫০%+ ছাড়িয়েছে!'});

    g('insights-list').innerHTML=insights.slice(0,5).map(ins=>`<div class="ins"><div class="ins-ico" style="background:var(--p-light);font-size:16px">${ins.e}</div><span style="font-size:11px;font-family:'Hind Siliguri',sans-serif">${ins.t}</span></div>`).join('');
  }

  renderRecent() {
    const recent=[...this.data.transactions].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6);
    if(!recent.length){g('recent-list').innerHTML='<div class="empty"><i class="fas fa-receipt"></i><p>কোনো লেনদেন নেই</p></div>';return;}
    g('recent-list').innerHTML=recent.map(t=>{
      const acc=this.getAcc(t.accountId); const isInc=t.type==='income'; const isTr=t.type==='transfer';
      const color=isInc?'var(--green)':isTr?'var(--blue)':'var(--red)'; const sign=isInc?'+':isTr?'⇄':'-';
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)"><div style="width:34px;height:34px;border-radius:9px;background:${color}1a;border:1px solid ${color}33;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${this.catEmoji(t.category)}</div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;color:var(--head);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'Hind Siliguri',sans-serif">${t.title}</div><div style="font-size:10px;color:var(--muted)">${t.category} · ${t.date}</div></div><div style="font-size:13px;font-weight:800;color:${color};white-space:nowrap">${sign}${this.fmt(t.amount)}</div></div>`;
    }).join('');
  }

  // ── RENDER: TRANSACTIONS ──────────────────────────────────────
  renderTx() {
    this.fillAcc('f-acc'); this.fillAcc('f-to-acc');
    const fc=g('t-cat'); if(fc){const all=[...this.INCOME_CATS,...this.EXPENSE_CATS];fc.innerHTML='<option value="all">সব ক্যাটাগরি</option>'+all.map(c=>`<option value="${c}">${c}</option>`).join('');}
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
          <td><span style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:99px;font-size:9px;font-weight:700;background:var(--surface2);border:1px solid var(--border);color:var(--muted)">${this.catEmoji(t.category)} ${t.category}</span></td>
          <td style="font-size:10px;color:var(--muted)">${acc?`${this.accIcon(acc.type)} ${acc.name}`:'-'}</td>
          <td style="text-align:right;font-size:12px;font-weight:800;color:${color};white-space:nowrap">${sign}${this.fmt(t.amount)}</td>
          <td style="text-align:center"><div style="display:flex;gap:3px;justify-content:center"><button onclick="app.editTx('${t.id}')" class="btn btn-s bsm bico" title="সম্পাদনা"><i class="fas fa-pen" style="font-size:9px"></i></button><button onclick="app.deleteTx('${t.id}')" class="btn btn-d bsm bico" title="মুছুন"><i class="fas fa-trash" style="font-size:9px"></i></button></div></td>
        </tr>`;
      }).join('');
    }
    const ti=tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const to=tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    setText('tx-count',`${tx.length}টি রেকর্ড`); setText('tx-in',`+${this.fmt(ti)}`); setText('tx-out',`-${this.fmt(to)}`);
  }

  // ── RENDER: ACCOUNTS ──────────────────────────────────────────
  renderAccounts() {
    const grid=g('accounts-grid'); if(!grid) return;
    grid.innerHTML=this.data.accounts.map(acc=>{
      const bal=this.accBal(acc); const mTx=this.txForMonth().filter(t=>t.accountId===acc.id||t.toAccountId===acc.id);
      const mIn=mTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0); const mOut=mTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
      return `<div class="card acc-card ch" onclick="app.openAccModal('${acc.id}')" style="background:linear-gradient(135deg,${acc.color}18,${acc.color}06);border-color:${acc.color}28">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div style="width:42px;height:42px;border-radius:13px;background:${acc.color}22;border:1px solid ${acc.color}38;display:flex;align-items:center;justify-content:center;font-size:20px">${this.accIcon(acc.type)}</div><span class="badge" style="background:${acc.color}18;border-color:${acc.color}35;color:${acc.color};font-family:'Hind Siliguri',sans-serif">${acc.type}</span></div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:3px;font-family:'Hind Siliguri',sans-serif">${acc.name}</div>
        <div style="font-size:24px;font-weight:900;color:var(--head);letter-spacing:-.02em;font-family:'Hind Siliguri',sans-serif">${this.fmt(bal)}</div>
        <div style="display:flex;gap:14px;margin-top:10px;padding-top:10px;border-top:1px solid ${acc.color}18"><div><div style="font-size:8px;font-weight:800;text-transform:uppercase;color:var(--muted)">আয়</div><div style="font-size:11px;font-weight:800;color:var(--green);font-family:'Hind Siliguri',sans-serif">+${this.fmtK(mIn)}</div></div><div><div style="font-size:8px;font-weight:800;text-transform:uppercase;color:var(--muted)">খরচ</div><div style="font-size:11px;font-weight:800;color:var(--red);font-family:'Hind Siliguri',sans-serif">-${this.fmtK(mOut)}</div></div></div>
      </div>`;
    }).join('');
    if(!this.data.accounts.length)grid.innerHTML='<div class="empty"><i class="fas fa-wallet"></i><p>কোনো একাউন্ট নেই</p></div>';
  }

  // ── RENDER: MESS ──────────────────────────────────────────────
  renderMess() {
    const months=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
    setText('mess-month-lbl',`${months[this.month]} ${this.year}`);
    const mEntries=this.data.mess.entries.filter(e=>{const d=new Date(e.date);return d.getUTCMonth()===this.month&&d.getUTCFullYear()===this.year;});
    
    // Deposits
    const deposits = mEntries.filter(e => e.type === 'deposit');
    const totalDeposited = deposits.reduce((s,e) => s+e.amount, 0);

    // Expenses
    const expenses = mEntries.filter(e => e.type !== 'deposit');
    const totalExpenses = expenses.reduce((s,e) => s+e.amount, 0);

    // Expenses paid from mess fund (payerId = 'mess-fund')
    const fundExpenses = expenses.filter(e => e.payerId === 'mess-fund').reduce((s,e) => s+e.amount, 0);

    // Fund balance (Remaining cash in box)
    const fundBalance = totalDeposited - fundExpenses;

    const mc=this.data.mess.members.length;
    const share = mc>0 ? totalExpenses/mc : 0;

    setText('mess-total',this.fmt(totalExpenses));
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
        const diff=(depAmt+outAmt)-share;
        const clr=['#f97316','#3b82f6','#10b981','#a855f7','#f43f5e'][i%5];
        return `<div class="mess-member">
          <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
            <div class="mess-av" style="background:${clr}">${m.name[0]}</div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:13px;font-weight:700;color:var(--head);font-family:'Hind Siliguri',sans-serif">${m.name}</span>
                <button onclick="app.editMessMember('${m.id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:9px" title="সম্পাদনা"><i class="fas fa-pen"></i></button>
                <button onclick="app.deleteMessMember('${m.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:9px;opacity:0.6" title="মুছুন"><i class="fas fa-trash"></i></button>
              </div>
              <div style="font-size:10px;color:var(--muted);font-family:'Hind Siliguri',sans-serif">জমা: ${this.fmt(depAmt)} | ব্যক্তিগত খরচ: ${this.fmt(outAmt)}</div>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:13px;font-weight:800;color:${diff>0?'var(--green)':diff<0?'var(--red)':'var(--muted)'};font-family:'Hind Siliguri',sans-serif">
              ${diff>0?'+':''}${this.fmt(Math.abs(diff))}
            </div>
            <div style="font-size:9px;font-weight:700;color:${diff>0?'var(--green)':diff<0?'var(--red)':'var(--muted)'};font-family:'Hind Siliguri',sans-serif">
              ${diff>0?'জমা আছে':diff<0?'জমা দেবে':'হিসাব সমান'}
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
      el.innerHTML=[...mEntries].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e=>{
        const isDep = e.type === 'deposit';
        let payerName = '-';
        if (e.payerId === 'mess-fund') {
          payerName = '📦 মেস তহবিল';
        } else {
          const payer=this.data.mess.members.find(m=>m.id===e.payerId);
          if (payer) payerName = payer.name;
        }
        const color = isDep ? 'var(--green)' : 'var(--p)';
        return `<tr>
          <td style="font-size:10px;color:var(--muted);white-space:nowrap">${e.date}</td>
          <td>
            <div style="font-size:12px;font-weight:700;color:var(--head);font-family:'Hind Siliguri',sans-serif">${e.title}</div>
            <div style="font-size:9px;color:var(--muted)">${isDep?'তহবিলে জমা':e.category}</div>
          </td>
          <td style="font-size:11px;color:var(--text);font-family:'Hind Siliguri',sans-serif">${payerName}</td>
          <td style="text-align:right;font-size:12px;font-weight:800;color:${color};white-space:nowrap">${isDep?'+':''}${this.fmt(e.amount)}</td>
          <td><div style="display:flex;gap:3px"><button onclick="app.openMessEntry('${e.id}')" class="btn btn-s bsm bico"><i class="fas fa-pen" style="font-size:9px"></i></button><button onclick="app.deleteMessEntry2('${e.id}')" class="btn btn-d bsm bico"><i class="fas fa-trash" style="font-size:9px"></i></button></div></td>
        </tr>`;
      }).join('');
    }

    // Mess chart
    const catT={}; expenses.forEach(e=>{catT[e.category]=(catT[e.category]||0)+e.amount;});
    const labels=Object.keys(catT); const data=Object.values(catT);
    if(this.charts.mess)this.charts.mess.destroy();
    const ctx=g('mess-chart'); if(ctx&&labels.length){
      const muted=getMuted();
      this.charts.mess=new Chart(ctx,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:['#f97316','#f43f5e','#3b82f6','#10b981','#a855f7','#f59e0b'],borderColor:'transparent',borderWidth:0}]},options:{cutout:'72%',responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'},padding:7,usePointStyle:true}},tooltip:{callbacks:{label:c=>`${c.label}: ${this.fmt(c.parsed)}`}}}}});
    }
  }

  deleteMessEntry2(id) {
    if(!confirm('এই এন্ট্রি মুছবেন?')) return;
    this.data.mess.entries=this.data.mess.entries.filter(e=>e.id!==id); this.save('mess'); this.toast('মুছে গেছে।','info'); this.renderMess();
  }

  // ── RENDER: BAZAR ─────────────────────────────────────────────
  renderBazar(filter='all') {
    let items=this.data.bazar;
    if(filter==='pending')items=items.filter(b=>!b.done);
    else if(filter==='done')items=items.filter(b=>b.done);
    const total=this.data.bazar.length; const done=this.data.bazar.filter(b=>b.done).length;
    const estCost=this.data.bazar.reduce((s,b)=>s+(b.price||0),0);
    setText('bz-total-items',total); setText('bz-done-items',done); setText('bz-est-cost',this.fmt(estCost));
    const list=g('bazar-list'); const empty=g('bazar-empty'); if(!list) return;
    if(!items.length){list.innerHTML='';empty.style.display='';}
    else{
      empty.style.display='none';
      const prioOrder={high:0,mid:1,low:2};
      const sorted=[...items].sort((a,b)=>prioOrder[a.prio]-prioOrder[b.prio]);
      list.innerHTML=sorted.map(item=>{
        const prioIco={high:'🔴',mid:'🟡',low:'🟢'}[item.prio]||'⚪';
        return `<div class="bitem${item.done?' done':''}">
          <input type="checkbox" ${item.done?'checked':''} onchange="app.toggleBazar('${item.id}')">
          <span style="font-size:14px">${prioIco}</span>
          <div style="flex:1;min-width:0"><div class="bitem-name" style="font-size:13px;font-weight:700;color:var(--head);font-family:'Hind Siliguri',sans-serif">${item.name}</div>${item.qty?`<div style="font-size:10px;color:var(--muted)">${item.qty}</div>`:''}</div>
          ${item.price?`<div style="font-size:12px;font-weight:800;color:var(--p);white-space:nowrap;font-family:'Hind Siliguri',sans-serif">${this.fmt(item.price)}</div>`:''}
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
      ${!s.settled?`<div style="display:flex;gap:6px"><button onclick="app.settleSplit('${s.id}')" class="btn btn-g bsm" style="flex:1"><i class="fas fa-check"></i> পরিশোধ সম্পন্ন</button><button onclick="app.deleteSplit('${s.id}')" class="btn btn-d bsm bico" title="মুছুন"><i class="fas fa-trash" style="font-size:9px"></i></button></div>`:`<div style="display:flex;align-items:center;justify-content:space-between"><span class="badge bg">পরিশোধ হয়েছে ✓</span><button onclick="app.deleteSplit('${s.id}')" class="btn btn-d bsm bico" title="মুছুন" style="width:30px;height:30px;padding:0;display:inline-flex;align-items:center;justify-content:center"><i class="fas fa-trash" style="font-size:9px"></i></button></div>`}
    </div>`;

    const al=g('split-active-list'); const ae=g('split-empty');
    const dl=g('split-done-list'); const de=g('split-done-empty');
    if(!active.length){al.innerHTML='';ae.style.display='';}else{ae.style.display='none';al.innerHTML=active.map(renderSplit).join('');}
    if(!done.length){dl.innerHTML='';de.style.display='';}else{de.style.display='none';dl.innerHTML=done.map(renderSplit).join('');}
  }

  // ── RENDER: BUDGET ────────────────────────────────────────────
  renderBudget() {
    const months=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
    setText('budget-month-lbl',`${months[this.month]} ${this.year}`);
    const mTx=this.txForMonth(); const entries=Object.entries(this.data.budgets); const bl=g('budget-list'); const be=g('budget-empty');
    if(!entries.length){bl.innerHTML='';be.style.display='';}
    else{
      be.style.display='none'; let ts=0,tsp=0;
      bl.innerHTML=entries.map(([cat,lim])=>{
        const sp=mTx.filter(t=>t.type==='expense'&&t.category===cat).reduce((s,t)=>s+t.amount,0);
        const pct=Math.min(100,Math.round((sp/lim)*100)); const color=pct>=100?'var(--red)':pct>=80?'var(--amber)':'var(--green)';
        const status=pct>=100?'🚨 সীমা পার':pct>=80?'⚠️ প্রায় শেষ':'✓ ঠিক আছে';
        ts+=lim; tsp+=sp;
        return `<div style="padding:12px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
            <div style="font-size:12px;font-weight:700;color:var(--head);display:flex;align-items:center;gap:6px;font-family:'Hind Siliguri',sans-serif">${this.catEmoji(cat)} ${cat} <span style="font-size:9px;padding:1px 6px;border-radius:99px;background:${color}15;color:${color}">${status}</span></div>
            <div style="font-size:10px;color:var(--muted);font-family:'Hind Siliguri',sans-serif">${this.fmt(sp)} / ${this.fmt(lim)}</div>
          </div>
          <div style="height:5px;border-radius:99px;background:var(--border)"><div style="height:100%;width:${pct}%;border-radius:99px;background:${color};transition:width .8s"></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:3px"><span style="font-size:9px;color:var(--muted)">${pct}%</span><button onclick="app.deleteBudget('${cat}')" style="font-size:9px;color:var(--red);background:none;border:none;cursor:pointer;font-weight:700;font-family:'Hind Siliguri',sans-serif">মুছুন</button></div>
        </div>`;
      }).join('');
      setText('budget-total-set',this.fmt(ts)); setText('budget-total-spent',this.fmt(tsp));
      // Chart
      const COLORS=['#f97316','#f43f5e','#10b981','#f59e0b','#3b82f6','#a855f7'];
      if(this.charts.bud)this.charts.bud.destroy();
      const ctx=g('budget-chart'); if(ctx){const muted=getMuted();this.charts.bud=new Chart(ctx,{type:'doughnut',data:{labels:entries.map(([c])=>c),datasets:[{data:entries.map(([,v])=>v),backgroundColor:COLORS,borderColor:'transparent',borderWidth:0}]},options:{cutout:'72%',responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'},padding:7,usePointStyle:true}},tooltip:{callbacks:{label:c=>`${c.label}: ${this.fmt(c.parsed)}`}}}}});}
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
            <div style="flex:1;min-width:0"><div style="font-size:20px;line-height:1;margin-bottom:3px">${gl.icon||'🎯'}</div><div style="font-size:13px;font-weight:800;color:var(--head);font-family:'Hind Siliguri',sans-serif">${gl.name}</div>${daysLeft!==null?`<div style="font-size:9px;color:${daysLeft<0?'var(--red)':daysLeft<7?'var(--amber)':'var(--muted)'}">${daysLeft<0?'সময় শেষ':'⏰ '+daysLeft+' দিন বাকি'}</div>`:''}</div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:5px">
            <div><div class="label">সঞ্চিত</div><div style="font-size:15px;font-weight:900;color:${color};font-family:'Hind Siliguri',sans-serif">${this.fmt(gl.saved)}</div></div>
            <div style="text-align:right"><div class="label">লক্ষ্য</div><div style="font-size:15px;font-weight:900;color:var(--head);font-family:'Hind Siliguri',sans-serif">${this.fmt(gl.target)}</div></div>
          </div>
          <div style="height:5px;border-radius:99px;background:var(--border);margin-bottom:12px"><div style="height:100%;width:${pct}%;border-radius:99px;background:${color}"></div></div>
          <div style="display:flex;gap:5px">
            <button onclick="app.openContrib('${gl.id}')" class="btn btn-g bsm" style="flex:1"><i class="fas fa-plus"></i> সঞ্চয়</button>
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
        <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:var(--head);font-family:'Hind Siliguri',sans-serif">${d.person}</div>${d.desc?`<div style="font-size:10px;color:var(--muted);font-family:'Hind Siliguri',sans-serif">${d.desc}</div>`:''} ${d.due?`<div style="font-size:10px;color:${ov?'var(--red)':'var(--muted)'};font-family:'Hind Siliguri',sans-serif">তারিখ: ${d.due}${ov?' (মেয়াদ শেষ)':''}</div>`:''}</div>
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
    const now=new Date(); const bl=[],bi=[],be=[];
    for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);bl.push(mBn[d.getMonth()]);const tx=this.txForMonth(d.getMonth(),d.getFullYear());bi.push(tx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0));be.push(tx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0));}
    const muted=getMuted();
    if(this.charts.rBar)this.charts.rBar.destroy();
    const ctx1=g('r-bar');
    if(ctx1)this.charts.rBar=new Chart(ctx1,{type:'bar',data:{labels:bl,datasets:[{label:'আয়',data:bi,backgroundColor:'rgba(16,185,129,.6)',borderRadius:5},{label:'খরচ',data:be,backgroundColor:'rgba(244,63,94,.6)',borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'},usePointStyle:true}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${this.fmt(c.parsed.y)}`}}},scales:{x:{grid:{display:false},ticks:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'}}},y:{grid:{color:'rgba(255,255,255,.03)'},ticks:{color:muted,font:{size:9,family:'Hind Siliguri'},callback:v=>this.fmtK(v)}}}}});
    const catT={};allTx.filter(t=>t.type==='expense').forEach(t=>{catT[t.category]=(catT[t.category]||0)+t.amount;});
    const sc=Object.entries(catT).sort((a,b)=>b[1]-a[1]);
    if(this.charts.rCat)this.charts.rCat.destroy();
    const ctx2=g('r-cat');
    if(ctx2)this.charts.rCat=new Chart(ctx2,{type:'doughnut',data:{labels:sc.map(([c])=>c),datasets:[{data:sc.map(([,v])=>v),backgroundColor:['#f97316','#f43f5e','#10b981','#f59e0b','#3b82f6','#a855f7','#06b6d4','#ec4899'],borderColor:'transparent',borderWidth:0}]},options:{cutout:'72%',responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'},padding:7,usePointStyle:true}},tooltip:{callbacks:{label:c=>`${c.label}: ${this.fmt(c.parsed)}`}}}}});
    const tc=g('top-cats');
    if(tc){const max=sc[0]?.[1]||1;tc.innerHTML=sc.slice(0,5).map(([cat,amt],i)=>{const pct=Math.round((amt/max)*100);const clrs=['#f97316','#f43f5e','#10b981','#f59e0b','#3b82f6'][i];return `<div><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-size:12px;font-weight:700;color:var(--head);font-family:'Hind Siliguri',sans-serif">${this.catEmoji(cat)} ${cat}</span><span style="font-size:12px;font-weight:800;color:var(--head);font-family:'Hind Siliguri',sans-serif">${this.fmt(amt)}</span></div><div style="height:4px;border-radius:99px;background:var(--border)"><div style="height:100%;width:${pct}%;border-radius:99px;background:${clrs}"></div></div></div>`;}).join('');}
    const dow=[0,0,0,0,0,0,0];allTx.filter(t=>t.type==='expense').forEach(t=>{const day=new Date(t.date).getDay();dow[day]+=t.amount;});
    if(this.charts.rDow)this.charts.rDow.destroy();
    const ctx3=g('r-dow');
    if(ctx3)this.charts.rDow=new Chart(ctx3,{type:'bar',data:{labels:['রবি','সোম','মঙ্গল','বুধ','বৃহ','শুক্র','শনি'],datasets:[{data:dow,backgroundColor:dow.map(v=>v===Math.max(...dow)?'rgba(249,115,22,.7)':'rgba(249,115,22,.25)'),borderRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${this.fmt(c.parsed.y)}`}}},scales:{x:{grid:{display:false},ticks:{color:muted,font:{size:9,weight:'700',family:'Hind Siliguri'}}},y:{display:false}}}});
    this.renderCalendar();
  }

  // ── CALENDAR ──────────────────────────────────────────────────
  bindCalendar() {
    g('cal-prev')?.addEventListener('click',()=>{this.calMonth--;if(this.calMonth<0){this.calMonth=11;this.calYear--;}this.renderCalendar();});
    g('cal-next')?.addEventListener('click',()=>{this.calMonth++;if(this.calMonth>11){this.calMonth=0;this.calYear++;}this.renderCalendar();});
  }

  renderCalendar() {
    const months=['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
    setText('cal-label',`${months[this.calMonth]} ${this.calYear}`);
    const headers=g('cal-headers'); const grid=g('cal-grid'); if(!headers||!grid) return;
    headers.innerHTML=['র','স','ম','বু','বৃ','শু','শ'].map(d=>`<div class="cdh">${d}</div>`).join('');
    const first=new Date(this.calYear,this.calMonth,1).getDay();
    const dim=new Date(this.calYear,this.calMonth+1,0).getDate();
    const today=new Date(); const byDate={};
    this.data.transactions.forEach(t=>{if(!t.date)return;const d=new Date(t.date);if(d.getUTCMonth()!==this.calMonth||d.getUTCFullYear()!==this.calYear)return;const k=d.getUTCDate();if(!byDate[k])byDate[k]={income:0,expense:0};if(t.type==='income')byDate[k].income+=t.amount;else if(t.type==='expense')byDate[k].expense+=t.amount;});
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
    const tx=this.data.transactions.filter(t=>{if(!t.date)return false;const d=new Date(t.date);return d.getUTCDate()===day&&d.getUTCMonth()===this.calMonth&&d.getUTCFullYear()===this.calYear;});
    if(!tx.length){detail.style.display='none';return;}
    detail.style.display='';
    detail.innerHTML=`<div style="font-size:11px;font-weight:800;color:var(--head);margin-bottom:6px;font-family:'Hind Siliguri',sans-serif">${this.calYear}-${String(this.calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}</div>`+tx.map(t=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:11px"><span style="font-family:'Hind Siliguri',sans-serif">${this.catEmoji(t.category)} ${t.title}</span><span style="font-weight:800;color:${t.type==='income'?'var(--green)':'var(--red)'};">${t.type==='income'?'+':'-'}${this.fmt(t.amount)}</span></div>`).join('');
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
    g('p-sync-join')?.addEventListener('click', () => this.handleSyncJoin());
    g('p-sync-now')?.addEventListener('click', () => this.handleSyncNow());
    g('header-sync-btn')?.addEventListener('click', () => this.handleSyncNow());
    this.applySyncUI();
  }

  applySyncUI() {
    const code = this.data.settings.syncCode;
    const last = this.data.settings.lastSync;
    
    const pId = g('p-sync-id');
    const pJoin = g('p-sync-join');
    const pNow = g('p-sync-now');
    const hSync = g('header-sync-btn');
    const pStatus = g('p-sync-status');
    
    if (code) {
      if (pId) { pId.value = code; pId.readOnly = true; }
      if (pJoin) { pJoin.textContent = 'লিংক সরান'; pJoin.style.background = 'var(--red)'; }
      if (pNow) pNow.style.display = '';
      if (hSync) hSync.style.display = 'inline-flex';
      if (pStatus) pStatus.textContent = last ? `সর্বশেষ সিঙ্ক: ${last}` : 'সংযুক্ত করা হয়েছে।';
    } else {
      if (pId) { pId.value = ''; pId.readOnly = false; }
      if (pJoin) { pJoin.textContent = 'যোগ দিন'; pJoin.style.background = ''; }
      if (pNow) pNow.style.display = 'none';
      if (hSync) hSync.style.display = 'none';
      if (pStatus) pStatus.textContent = '';
    }
  }

  async cloudUpload() {
    const id = this.data.settings.syncId;
    if(!id) return;
    try {
      const syncBtn = g('header-sync-btn');
      const icon = syncBtn?.querySelector('i');
      if(icon) icon.className = 'fas fa-rotate fa-spin';
      
      const payload = {
        transactions: this.data.transactions,
        accounts: this.data.accounts,
        budgets: this.data.budgets,
        goals: this.data.goals,
        debts: this.data.debts,
        mess: this.data.mess,
        bazar: this.data.bazar,
        splits: this.data.splits
      };
      
      const res = await fetch(`https://api.npoint.io/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Sync failed");
      
      this.data.settings.lastSync = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.save('settings');
      this.applySyncUI();
      
      if(icon) icon.className = 'fas fa-rotate';
    } catch(err) {
      console.error(err);
      this.toast('ক্লাউডে ডেটা আপলোড করা যায়নি।','error');
      const syncBtn = g('header-sync-btn');
      const icon = syncBtn?.querySelector('i');
      if(icon) icon.className = 'fas fa-rotate';
    }
  }

  async cloudDownload() {
    const id = this.data.settings.syncId;
    if(!id) return;
    try {
      const syncBtn = g('header-sync-btn');
      const icon = syncBtn?.querySelector('i');
      if(icon) icon.className = 'fas fa-rotate fa-spin';
      
      const res = await fetch(`https://api.npoint.io/${id}`);
      if (!res.ok) throw new Error("Fetch failed");
      const remoteData = await res.json();
      
      if (remoteData) {
        if(remoteData.transactions) this.data.transactions = remoteData.transactions;
        if(remoteData.accounts) this.data.accounts = remoteData.accounts;
        if(remoteData.budgets) this.data.budgets = remoteData.budgets;
        if(remoteData.goals) this.data.goals = remoteData.goals;
        if(remoteData.debts) this.data.debts = remoteData.debts;
        if(remoteData.mess) this.data.mess = remoteData.mess;
        if(remoteData.bazar) this.data.bazar = remoteData.bazar;
        if(remoteData.splits) this.data.splits = remoteData.splits;
        
        this.save('transactions');
        this.save('accounts');
        this.save('budgets');
        this.save('goals');
        this.save('debts');
        this.save('mess');
        this.save('bazar');
        this.save('splits');
        
        this.data.settings.lastSync = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.save('settings');
        
        this.applySyncUI();
        this.render();
      }
      
      if(icon) icon.className = 'fas fa-rotate';
    } catch(err) {
      console.error(err);
      this.toast('ক্লাউড থেকে ডেটা ডাউনলোড করা যায়নি।','error');
      const syncBtn = g('header-sync-btn');
      const icon = syncBtn?.querySelector('i');
      if(icon) icon.className = 'fas fa-rotate';
    }
  }

  async handleSyncJoin() {
    const code = this.data.settings.syncCode;
    if(code){
      if(confirm('মেস লিংক সরাতে চান? এর পর থেকে অফলাইনে ডেটা সেভ হবে।')){
        this.data.settings.syncCode = '';
        this.data.settings.syncId = '';
        this.data.settings.lastSync = '';
        this.save('settings');
        this.applySyncUI();
        this.toast('মেস লিংক সফলভাবে সরানো হয়েছে।','info');
      }
    } else {
      const inputVal = g('p-sync-id').value.trim();
      if(!inputVal){
        this.toast('মেস শেয়ার কোডটি লিখুন।','error');
        return;
      }
      
      this.toast('কোড চেক করা হচ্ছে...','info');
      try {
        const kvRes = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/swnr32ym/bk_sync_${inputVal}`);
        if (!kvRes.ok) throw new Error("KV fetch failed");
        
        let binId = await kvRes.json();
        if (binId) binId = binId.trim();
        
        if (binId && binId !== "" && binId !== "null") {
          // Found matching npoint ID! Join it
          this.toast('মেসে যোগ দেওয়া হচ্ছে...','info');
          const res = await fetch(`https://api.npoint.io/${binId}`);
          if (!res.ok) throw new Error("Fetch failed");
          const remoteData = await res.json();
          
          if (confirm(`"${inputVal}" মেসটি পাওয়া গেছে! যোগ দিতে চান? আপনার বর্তমান সমস্ত লোকাল ডেটা মুছে শেয়ার করা মেসের ডেটা লোড করা হবে!`)) {
            this.data.settings.syncCode = inputVal;
            this.data.settings.syncId = binId;
            this.data.settings.lastSync = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            this.save('settings');
            
            if (remoteData && Object.keys(remoteData).length > 0) {
              if(remoteData.transactions) this.data.transactions = remoteData.transactions;
              if(remoteData.accounts) this.data.accounts = remoteData.accounts;
              if(remoteData.budgets) this.data.budgets = remoteData.budgets;
              if(remoteData.goals) this.data.goals = remoteData.goals;
              if(remoteData.debts) this.data.debts = remoteData.debts;
              if(remoteData.mess) this.data.mess = remoteData.mess;
              if(remoteData.bazar) this.data.bazar = remoteData.bazar;
              if(remoteData.splits) this.data.splits = remoteData.splits;
              
              this.save('transactions');
              this.save('accounts');
              this.save('budgets');
              this.save('goals');
              this.save('debts');
              this.save('mess');
              this.save('bazar');
              this.save('splits');
            }
            
            this.applySyncUI();
            this.render();
            this.toast('সফলভাবে শেয়ার মেসে যোগ দিয়েছেন!','success');
          }
        } else {
          // Brand new custom code
          const userBinId = prompt(`"${inputVal}" কোডটি নতুন! এটি প্রথমবার চালু করার জন্য অনুগ্রহ করে npoint.io থেকে একটি ফ্রী বিন আইডি (যেমন: 4a9f83) দিন। (পরবর্তীতে রুমমেটদের আর এটি দিতে হবে না, সরাসরি এই কাস্টম কোড লিখলেই হবে)`);
          if (!userBinId) return;
          
          const cleanBinId = userBinId.trim();
          this.toast('কোড রেজিস্টার হচ্ছে...','info');
          
          const checkRes = await fetch(`https://api.npoint.io/${cleanBinId}`);
          if(!checkRes.ok) {
            this.toast('ভুল বিন আইডি! আবার চেষ্টা করুন।','error');
            return;
          }
          
          // Map the custom code to this npoint bin ID
          await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/swnr32ym/bk_sync_${inputVal}/${cleanBinId}`, { method: 'POST' });
          
          this.data.settings.syncCode = inputVal;
          this.data.settings.syncId = cleanBinId;
          this.data.settings.lastSync = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          this.save('settings');
          
          this.applySyncUI();
          this.cloudUpload(); // Upload local data to initialize the new npoint bin
          this.toast('মেস কোড সফলভাবে সেটআপ হয়েছে!','success');
        }
      } catch(err) {
        console.error(err);
        this.toast('সিঙ্ক সংযোগ করা যায়নি।','error');
      }
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
    const colors={info:'#818cf8',success:'#34d399',error:'#fb7185',warning:'#fbbf24'};
    el.innerHTML=`<i class="fas ${icons[type]||'fa-info-circle'}" style="color:${colors[type]};font-size:13px;flex-shrink:0"></i><span style="font-family:'Hind Siliguri',sans-serif">${msg}</span>`;
    wrap.appendChild(el); setTimeout(()=>el.classList.add('show'),15);
    setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),500);},3500);
  }
}

// ── HELPERS ─────────────────────────────────────────────────────
function g(id) { return document.getElementById(id); }
function setText(id, val) { const el=g(id); if(el) el.textContent=val; }
function getMuted() { return getComputedStyle(document.documentElement).getPropertyValue('--muted').trim()||'#888'; }

// ── LAUNCH ──────────────────────────────────────────────────────
const app = new BachelorKhata();
