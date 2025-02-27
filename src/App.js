import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { v4 as uuidv4 } from 'uuid';

// 主應用程式元件
const App = () => {
  // 初始化狀態：旅客列表
  const [travelers, setTravelers] = useState(() => {
    const savedData = localStorage.getItem('travelExpenses');
    return savedData ? JSON.parse(savedData) : [
      {
        id: uuidv4(),
        name: '',
        expenses: [
          {
            id: uuidv4(),
            category: '',
            description: '',
            amount: '',
            isPersonal: false
          }
        ]
      }
    ];
  });
  
  // 初始化類別列表
  const [categories, setCategories] = useState(() => {
    const savedCategories = localStorage.getItem('expenseCategories');
    return savedCategories ? JSON.parse(savedCategories) : ['餐飲', '交通', '住宿', '娛樂', '購物'];
  });
  
  // 當前選擇的標籤狀態
  const [activeTab, setActiveTab] = useState('total');
  const [activePersonTab, setActivePersonTab] = useState('');
  
  // 列印用的參考
  const printRef = useRef();
  
  // 儲存數據到localStorage
  useEffect(() => {
    localStorage.setItem('travelExpenses', JSON.stringify(travelers));
    localStorage.setItem('expenseCategories', JSON.stringify(categories));
  }, [travelers, categories]);
  
  // 當旅客列表變更時，確保有選擇的個人標籤
  useEffect(() => {
    if (travelers.length > 0 && activePersonTab === '') {
      setActivePersonTab(travelers[0].id);
    }
  }, [travelers, activePersonTab]);
  
  // 處理列印功能
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });
  
  // 新增旅客
  const addTraveler = () => {
    setTravelers([...travelers, {
      id: uuidv4(),
      name: '',
      expenses: [{
        id: uuidv4(),
        category: '',
        description: '',
        amount: '',
        isPersonal: false
      }]
    }]);
  };
  
  // 刪除旅客
  const removeTraveler = (travelerId) => {
    setTravelers(travelers.filter(traveler => traveler.id !== travelerId));
    if (activePersonTab === travelerId && travelers.length > 1) {
      setActivePersonTab(travelers[0].id === travelerId ? travelers[1].id : travelers[0].id);
    }
  };
  
  // 更新旅客資訊
  const updateTravelerName = (travelerId, name) => {
    setTravelers(travelers.map(traveler => 
      traveler.id === travelerId ? { ...traveler, name } : traveler
    ));
  };
  
  // 新增費用項目
  const addExpense = (travelerId) => {
    setTravelers(travelers.map(traveler => 
      traveler.id === travelerId ? {
        ...traveler,
        expenses: [
          ...traveler.expenses,
          {
            id: uuidv4(),
            category: '',
            description: '',
            amount: '',
            isPersonal: false
          }
        ]
      } : traveler
    ));
  };
  
  // 移除費用項目
  const removeExpense = (travelerId, expenseId) => {
    setTravelers(travelers.map(traveler => 
      traveler.id === travelerId ? {
        ...traveler,
        expenses: traveler.expenses.filter(expense => expense.id !== expenseId)
      } : traveler
    ));
  };
  
  // 更新費用項目
  const updateExpense = (travelerId, expenseId, field, value) => {
    setTravelers(travelers.map(traveler => 
      traveler.id === travelerId ? {
        ...traveler,
        expenses: traveler.expenses.map(expense => 
          expense.id === expenseId ? {
            ...expense,
            [field]: field === 'amount' ? (value === '' ? '' : parseFloat(value)) : value
          } : expense
        )
      } : traveler
    ));
  };
  
  // 新增類別
  const addCategory = (newCategory) => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
    }
  };
  
  // 計算各類別的總支出
  const calculateCategoryTotals = (personalId = null) => {
    const categoryTotals = {};
    let grandTotal = 0;
    
    // 如果是計算個人支出，需要計算共享費用的平均值加上個人項目
    if (personalId) {
      // 第一步：計算共享費用的項目和類別（與總計標籤相同的結構）
      const sharedCategoryTotals = {};
      let sharedTotal = 0;
      
      // 遍歷所有非個人項目，按類別和項目名稱分類
      travelers.forEach(traveler => {
        traveler.expenses.forEach(expense => {
          if (expense.amount && !isNaN(expense.amount) && !expense.isPersonal) {
            const category = expense.category || '未分類';
            
            if (!sharedCategoryTotals[category]) {
              sharedCategoryTotals[category] = {
                total: 0,
                items: {}
              };
            }
            
            const amountValue = parseFloat(expense.amount);
            
            // 按項目名稱累加金額
            if (!sharedCategoryTotals[category].items[expense.description]) {
              sharedCategoryTotals[category].items[expense.description] = 0;
            }
            sharedCategoryTotals[category].items[expense.description] += amountValue;
            sharedCategoryTotals[category].total += amountValue;
            sharedTotal += amountValue;
          }
        });
      });
      
      // 第二步：將共享費用平均分配給每人（四捨五入至整數）
      const numTravelers = travelers.length;
      
      // 分配共享費用到個人
      for (const category in sharedCategoryTotals) {
        if (!categoryTotals[category]) {
          categoryTotals[category] = {
            total: 0,
            items: []
          };
        }
        
        let categoryPersonalTotal = 0;
        
        // 將每個項目平均分配
        for (const [description, amount] of Object.entries(sharedCategoryTotals[category].items)) {
          // 計算每人應分擔的金額（四捨五入至整數）
          const perPersonItemAmount = Math.round(amount / numTravelers);
          
          categoryTotals[category].items.push({
            description: description,
            amount: perPersonItemAmount
          });
          
          categoryPersonalTotal += perPersonItemAmount;
        }
        
        categoryTotals[category].total = categoryPersonalTotal;
        grandTotal += categoryPersonalTotal;
      }
      
      // 第三步：加入該人的個人項目
      const currentTraveler = travelers.find(t => t.id === personalId);
      if (currentTraveler) {
        currentTraveler.expenses.forEach(expense => {
          if (expense.amount && !isNaN(expense.amount) && expense.isPersonal) {
            const category = expense.category || '個人項目';
            const amountValue = parseFloat(expense.amount);
            
            if (!categoryTotals[category]) {
              categoryTotals[category] = {
                total: 0,
                items: []
              };
            }
            
            // 尋找已有的相同項目
            const existingItemIndex = categoryTotals[category].items.findIndex(
              item => item.description === expense.description
            );
            
            if (existingItemIndex !== -1) {
              // 如果已有相同項目，加總金額
              categoryTotals[category].items[existingItemIndex].amount += amountValue;
            } else {
              // 否則新增項目
              categoryTotals[category].items.push({
                description: expense.description,
                amount: amountValue
              });
            }
            
            categoryTotals[category].total += amountValue;
            grandTotal += amountValue;
          }
        });
      }
    } else {
      // 總支出標籤的計算邏輯（保持不變，只計算非個人項目）
      travelers.forEach(traveler => {
        traveler.expenses.forEach(expense => {
          if (expense.amount && !isNaN(expense.amount) && !expense.isPersonal) {
            const category = expense.category || '未分類';
            
            if (!categoryTotals[category]) {
              categoryTotals[category] = {
                total: 0,
                items: []
              };
            }
            
            // 尋找已有的相同項目
            const existingItemIndex = categoryTotals[category].items.findIndex(
              item => item.description === expense.description
            );
            
            if (existingItemIndex !== -1) {
              // 如果已有相同項目，加總金額
              categoryTotals[category].items[existingItemIndex].amount += parseFloat(expense.amount);
            } else {
              // 否則新增項目
              categoryTotals[category].items.push({
                description: expense.description,
                amount: parseFloat(expense.amount)
              });
            }
            
            categoryTotals[category].total += parseFloat(expense.amount);
            grandTotal += parseFloat(expense.amount);
          }
        });
      });
    }
    
    return { categoryTotals, grandTotal };
  };
  
  // 計算每人應付金額與互相轉帳金額
  const calculateBalances = () => {
    // 計算每人付出的金額（不包括個人項目）
    const payments = travelers.map(traveler => {
      const paid = traveler.expenses.reduce((sum, expense) => {
        return sum + (expense.amount && !expense.isPersonal ? parseFloat(expense.amount) || 0 : 0);
      }, 0);
      
      return {
        id: traveler.id,
        name: traveler.name || '未命名',
        paid
      };
    });
    
    // 計算共享費用總額
    const totalShared = payments.reduce((sum, person) => sum + person.paid, 0);
    
    // 每人應付金額（平均分攤）
    const perPersonShare = totalShared / travelers.length;
    
    // 計算每人的餘額（正值表示應收，負值表示應付）
    const balances = payments.map(person => ({
      ...person,
      balance: person.paid - perPersonShare
    }));
    
    // 計算誰付給誰
    const transactions = [];
    
    // 深拷貝以不影響原始數據
    const balancesCopy = [...balances];
    
    // 按餘額排序（從最負到最正）
    balancesCopy.sort((a, b) => a.balance - b.balance);
    
    // 計算轉帳
    while (balancesCopy.length > 1) {
      const debtor = balancesCopy[0]; // 最負（欠最多的）
      const creditor = balancesCopy[balancesCopy.length - 1]; // 最正（多付最多的）
      
      // 處理浮點數精度問題
      const debtorBalance = Math.round(debtor.balance * 100) / 100;
      const creditorBalance = Math.round(creditor.balance * 100) / 100;
      
      if (Math.abs(debtorBalance) < 0.01 && Math.abs(creditorBalance) < 0.01) {
        // 如果餘額接近零，移除它們
        balancesCopy.shift();
        balancesCopy.pop();
        continue;
      }
      
      // 計算轉帳金額（取兩者絕對值的較小者）
      const amount = Math.min(Math.abs(debtorBalance), Math.abs(creditorBalance));
      
      if (amount > 0) {
        transactions.push({
          from: debtor.name,
          to: creditor.name,
          amount: Math.round(amount)
        });
      }
      
      // 更新餘額
      debtor.balance += amount;
      creditor.balance -= amount;
      
      // 移除已平衡的人
      if (Math.abs(debtor.balance) < 0.01) {
        balancesCopy.shift();
      }
      
      if (Math.abs(creditor.balance) < 0.01) {
        balancesCopy.pop();
      }
    }
    
    return { payments, perPersonShare: Math.round(perPersonShare), transactions };
  };
  
  return (
    <div className="max-w-4xl mx-auto p-4 font-sans">
      <h1 className="text-2xl font-bold text-center mb-6">旅遊分帳系統</h1>
      
      {/* 輸入區塊 */}
      <div className="mb-8 p-4 border rounded-lg bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">1. 輸入旅遊成員與費用</h2>
        
        {travelers.map(traveler => (
          <div key={traveler.id} className="mb-6 p-4 border rounded-lg bg-white">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                <span className="text-xl">👤</span>
              </div>
              <div className="flex-grow">
                <label className="block text-sm font-medium text-gray-700 mb-1">名稱</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  placeholder="小明"
                  value={traveler.name}
                  onChange={e => updateTravelerName(traveler.id, e.target.value)}
                />
              </div>
              <div className="ml-4 flex">
                <button
                  className="p-2 text-red-500 hover:text-red-700"
                  onClick={() => removeTraveler(traveler.id)}
                >
                  <span className="text-xl">❌</span>
                </button>
              </div>
            </div>
            
            {/* 費用項目列表 */}
            <div className="ml-12">
              <div className="grid grid-cols-6 gap-2 mb-2 font-medium text-sm">
                <div className="col-span-1">類別</div>
                <div className="col-span-2">項目名稱</div>
                <div className="col-span-1">金額</div>
                <div className="col-span-1 text-center">個人項目</div>
                <div className="col-span-1"></div>
              </div>
              
              {traveler.expenses.map(expense => (
                <div key={expense.id} className="grid grid-cols-6 gap-2 mb-2">
                  <div className="col-span-1">
                    <select
                      className="w-full p-2 border rounded"
                      value={expense.category}
                      onChange={e => updateExpense(traveler.id, expense.id, 'category', e.target.value)}
                    >
                      <option value="">選擇類別</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      className="w-full p-2 border rounded"
                      placeholder="項目名稱"
                      value={expense.description}
                      onChange={e => updateExpense(traveler.id, expense.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1">
                    <input
                      type="number"
                      className="w-full p-2 border rounded"
                      placeholder="金額"
                      value={expense.amount}
                      onChange={e => updateExpense(traveler.id, expense.id, 'amount', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="w-5 h-5"
                      checked={expense.isPersonal}
                      onChange={e => updateExpense(traveler.id, expense.id, 'isPersonal', e.target.checked)}
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      className="p-1 text-red-500 hover:text-red-700"
                      onClick={() => removeExpense(traveler.id, expense.id)}
                    >
                      <span className="text-xl">❌</span>
                    </button>
                  </div>
                </div>
              ))}
              
              <div className="mt-2">
                <button
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  onClick={() => addExpense(traveler.id)}
                >
                  新增項目
                </button>
              </div>
            </div>
          </div>
        ))}
        
        <div className="mt-4">
          <button
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={addTraveler}
          >
            新增旅遊成員
          </button>
        </div>
        
        <div className="mt-4">
          <div className="flex items-center">
            <label className="block text-sm font-medium text-gray-700 mr-2">新增類別:</label>
            <input
              type="text"
              className="p-2 border rounded mr-2"
              placeholder="輸入新類別"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  addCategory(e.target.value);
                  e.target.value = '';
                }
              }}
            />
            <button
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
              onClick={() => {
                const input = document.querySelector('input[placeholder="輸入新類別"]');
                if (input) {
                  addCategory(input.value);
                  input.value = '';
                }
              }}
            >
              新增
            </button>
          </div>
        </div>
      </div>
      
      {/* 結算區塊 */}
      <div className="mb-8 p-4 border rounded-lg bg-gray-50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">2. 旅遊費用結算</h2>
          <button
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
            onClick={handlePrint}
          >
            <span className="mr-1">🖨️</span> 列印
          </button>
        </div>
        
        {/* 標籤選擇 */}
        <div className="flex border-b mb-4">
          <button
            className={`px-4 py-2 mr-2 ${activeTab === 'total' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-t`}
            onClick={() => setActiveTab('total')}
          >
            總計
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'personal' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded-t`}
            onClick={() => setActiveTab('personal')}
          >
            個人花費
          </button>
        </div>
        
        {/* 個人標籤選擇（當activeTab為personal時顯示） */}
        {activeTab === 'personal' && (
          <div className="flex flex-wrap border-b mb-4">
            {travelers.map(traveler => (
              <button
                key={traveler.id}
                className={`px-3 py-1 mr-2 mb-2 ${activePersonTab === traveler.id ? 'bg-green-500 text-white' : 'bg-gray-200'} rounded`}
                onClick={() => setActivePersonTab(traveler.id)}
              >
                {traveler.name || '未命名'}
              </button>
            ))}
          </div>
        )}
        
        {/* 列印內容區域 */}
        <div ref={printRef} className="p-4 bg-white rounded-lg">
          {activeTab === 'total' ? (
            // 總計標籤內容
            <div>
              <h3 className="text-lg font-semibold mb-3 text-center">旅遊費用總表</h3>
              {(() => {
                const { categoryTotals, grandTotal } = calculateCategoryTotals();
                return (
                  <>
                    {Object.entries(categoryTotals).map(([category, data]) => (
                      <div key={category} className="mb-4">
                        <div className="flex justify-between font-semibold border-b pb-1 mb-2">
                          <span>{category}</span>
                          <span>$ {data.total.toFixed(0)}</span>
                        </div>
                        <div className="ml-4">
                          {data.items.map((item, index) => (
                            <div key={index} className="flex justify-between mb-1">
                              <span>{item.description}</span>
                              <span>$ {item.amount.toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-lg border-t pt-2 mt-4">
                      <span>本次旅遊總計</span>
                      <span>$ {grandTotal.toFixed(0)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            // 個人花費標籤內容
            <div>
              {travelers.map(traveler => {
                if (traveler.id !== activePersonTab) return null;
                
                const { categoryTotals, grandTotal } = calculateCategoryTotals(traveler.id);
                
                return (
                  <div key={traveler.id}>
                    <h3 className="text-lg font-semibold mb-3 text-center">
                      {traveler.name || '未命名'} 的費用明細
                    </h3>
                    
                    {Object.entries(categoryTotals).map(([category, data]) => (
                      <div key={category} className="mb-4">
                        <div className="flex justify-between font-semibold border-b pb-1 mb-2">
                          <span>{category}</span>
                          <span>$ {data.total.toFixed(0)}</span>
                        </div>
                        <div className="ml-4">
                          {data.items.map((item, index) => (
                            <div key={index} className="flex justify-between mb-1">
                              <span>{item.description}</span>
                              <span>$ {item.amount.toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex justify-between font-bold text-lg border-t pt-2 mt-4">
                      <span>個人總計</span>
                      <span>$ {grandTotal.toFixed(0)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* 不傷感情區塊 */}
      <div className="p-4 border rounded-lg bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">3. 不傷感情區</h2>
        
        <div className="bg-white p-4 rounded-lg">
          {(() => {
            const { payments, perPersonShare, transactions } = calculateBalances();
            
            return (
              <>
                <div className="mb-4">
                  {payments.map(person => (
                    <div key={person.id} className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                        <span>👤</span>
                      </div>
                      <span>{person.name}： 共負擔 {person.paid.toFixed(0)} 元</span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-dashed my-4 pt-4 pb-2 text-center font-bold">
                  算錢結果！！
                </div>
                
                <div className="mb-2 p-2 bg-gray-100 rounded">
                  每人平均 {perPersonShare} 元
                </div>
                
                {transactions.map((transaction, index) => (
                  <div key={index} className="mb-2 ml-4">
                    ▶ {transaction.from} 需給 {transaction.to} {transaction.amount} 元
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default App;