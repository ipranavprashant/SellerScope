import React, { useEffect, useState, useMemo } from 'react';
import Papa from 'papaparse';
import {
  LineChart, Line, PieChart, Pie, Tooltip, XAxis, YAxis,
  CartesianGrid, Legend, ResponsiveContainer, Cell, Brush
} from 'recharts';
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#00C49F", "#FFBB28", "#FF8042", "#a4de6c", "#d0ed57", "#8dd1e1"];

export default function SellerDashboard({ csvText }) {
  const [parsedData, setParsedData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timeInterval, setTimeInterval] = useState('auto');
  const [parseError, setParseError] = useState('');

  useEffect(() => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const formatted = results.data.map(entry => {
            const dateParts = entry.Date.split('-');
            if (dateParts.length !== 3) throw new Error('Invalid date format');
            
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1;
            const year = parseInt(dateParts[2], 10);
            
            const parsedDate = new Date(year, month, day);
            if (isNaN(parsedDate.getTime())) throw new Error('Invalid date');
            
            return {
              date: parsedDate,
              dateStr: parsedDate.toISOString().split('T')[0],
              item: entry.ITEAMS,
              payment: parseFloat(entry.PAYMENT) || 0,
              gst: parseFloat(entry.GST) || 0,
              rate: parseFloat(entry['ITEM RATE']) || 0,
              profit: parseFloat(entry.PROFIT) || 0,
              quantity: parseInt(entry.QUANTITY, 10) || 0,
              type: entry['RETURN / CANCEL']?.toUpperCase() || 'SALE',
            };
          }).filter(Boolean);
          
          setParsedData(formatted);
          setFilteredData(formatted);
          setParseError('');
        } catch (error) {
          setParseError(`Error parsing CSV: ${error.message}. Please check your date format (should be dd-mm-yyyy)`);
          console.error('CSV Parse Error:', error);
        }
      }
    });
  }, [csvText]);

  useEffect(() => {
    if (!startDate && !endDate) {
      setFilteredData(parsedData);
      return;
    }
    const from = startDate ? new Date(startDate + 'T00:00:00') : new Date('2000-01-01');
    const to = endDate ? new Date(endDate + 'T23:59:59') : new Date('2100-01-01');
    const filtered = parsedData.filter(entry => entry.date >= from && entry.date <= to);
    setFilteredData(filtered);
  }, [startDate, endDate, parsedData]);

  const profitChartData = useMemo(() => {
    if (filteredData.length === 0) return [];
    
    const dataMap = new Map();
    const diffDays = Math.ceil((filteredData[filteredData.length-1].date - filteredData[0].date) / (1000 * 60 * 60 * 24));
    
    let interval = timeInterval;
    if (timeInterval === 'auto') {
      interval = diffDays <= 7 ? 'day' : 
                diffDays <= 90 ? 'week' : 
                diffDays <= 365 ? 'month' : 'year';
    }

    filteredData.forEach(entry => {
      let key;
      const date = entry.date;
      
      switch(interval) {
        case 'week':
          key = startOfWeek(date).toISOString();
          break;
        case 'month':
          key = startOfMonth(date).toISOString();
          break;
        case 'year':
          key = startOfYear(date).toISOString();
          break;
        default: 
          key = startOfDay(date).toISOString();
      }

      if (!dataMap.has(key)) {
        dataMap.set(key, {
          date: key,
          totalProfit: 0,
          netRevenue: 0
        });
      }
      
      const bucket = dataMap.get(key);
      bucket.totalProfit += entry.profit;
      bucket.netRevenue += entry.payment - entry.gst;
    });

    return Array.from(dataMap.values())
      .map(item => ({ ...item, date: new Date(item.date) }))
      .sort((a, b) => a.date - b.date);
  }, [filteredData, timeInterval]);

  const dateFormatter = (date) => {
    const diffDays = Math.ceil((profitChartData[profitChartData.length-1]?.date - profitChartData[0]?.date) / (1000 * 60 * 60 * 24)) || 0;
    
    if (diffDays <= 7) return format(date, 'MMM dd');
    if (diffDays <= 90) return format(date, 'MMM yy');
    if (diffDays <= 365) return format(date, 'MMM yyyy');
    return format(date, 'yyyy');
  };

  const itemSales = {};
  filteredData.forEach(e => {
    if (!itemSales[e.item]) itemSales[e.item] = 0;
    itemSales[e.item] += e.quantity;
  });
  const itemChartData = Object.entries(itemSales)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const returnsCount = filteredData.filter(e => e.type.includes('CANCEL') || e.type.includes('RR')).length;
  const grossProfit = filteredData.reduce((acc, e) => acc + e.profit, 0);
  const grossRevenue = filteredData.reduce((acc, e) => acc + (e.payment - e.gst), 0);

  return (
    <div className="p-6 space-y-10">
      {parseError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {parseError}
        </div>
      )}

      <h2 className="text-3xl font-bold text-center">📊 Seller Dashboard</h2>

      <div className="flex flex-col md:flex-row justify-center gap-4 items-center flex-wrap">
        <div className="flex flex-col md:flex-row gap-4">
          <label className="text-sm">Start Date:
            <input 
              type="date" 
              className="ml-2 p-1 border rounded" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
            />
          </label>
          <label className="text-sm">End Date:
            <input 
              type="date" 
              className="ml-2 p-1 border rounded" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
            />
          </label>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm">Interval:</span>
          <select 
            className="p-1 border rounded"
            value={timeInterval}
            onChange={e => setTimeInterval(e.target.value)}
          >
            <option value="auto">Auto</option>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">
          {parseError ? 'Fix CSV errors to view data' : 'No data found for selected date range'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-4 rounded-2xl shadow-md">
              <h3 className="text-lg font-semibold mb-2">📈 Profit & Revenue Over Time</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={profitChartData} margin={{ top: 10, right: 20, bottom: 60, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={dateFormatter}
                    tick={{ angle: -45, textAnchor: 'end' }}
                    height={60}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value), 'PP')}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Line 
                    type="monotone" 
                    dataKey="totalProfit" 
                    stroke="#8884d8" 
                    name="Profit" 
                    strokeWidth={2} 
                    dot={{ r: 3 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="netRevenue" 
                    stroke="#82ca9d" 
                    name="Net Revenue" 
                    strokeWidth={2} 
                    dot={{ r: 3 }} 
                  />
                  <Brush 
                    dataKey="date" 
                    height={30} 
                    stroke="#8884d8" 
                    tickFormatter={dateFormatter}
                    y={340}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-md">
              <h3 className="text-lg font-semibold mb-2">🥇 Top-Selling Items</h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={itemChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={3}
                    label
                  >
                    {itemChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={60} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-md">
            <h3 className="text-lg font-semibold mb-2">📋 Summary</h3>
            <p>Total Orders: {filteredData.length}</p>
            <p>Returns/Cancellations: {returnsCount}</p>
            <p>Gross Profit: ₹{grossProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
            <p>Total Revenue (Excl. GST): ₹{grossRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
          </div>
        </>
      )}
    </div>
  );
}
