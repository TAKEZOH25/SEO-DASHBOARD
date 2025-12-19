import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

export default function Sparkline({ data, color = "#8884d8" }) {
    // Transform flat array [10, 20, 5, ...] to objects [{val: 10}, {val: 20}, ...]
    const chartData = data.map((val, i) => ({ i, val }));

    return (
        <div className="h-12 w-32">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <Line
                        type="monotone"
                        dataKey="val"
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                    {/* Hide Axis but keep domain auto to scale the line properly */}
                    <YAxis domain={['dataMin', 'dataMax']} hide />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
