#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成微信小程序 TabBar 图标
需要安装: pip install Pillow
"""

from PIL import Image, ImageDraw, ImageFont
import os

# 图标尺寸（微信小程序推荐 81x81px）
SIZE = 81
TABBAR_DIR = "images/tabbar"

# 确保目录存在
os.makedirs(TABBAR_DIR, exist_ok=True)

def create_icon(icon_type, is_active=False):
    """创建图标"""
    # 创建透明背景
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 颜色设置
    if is_active:
        # 选中状态：紫色 (#9b59b6)
        color = (155, 89, 182, 255)
    else:
        # 未选中状态：灰色 (#7A7E83)
        color = (122, 126, 131, 255)
    
    # 根据类型绘制不同的图标
    if icon_type == 'kitchen':
        # 厨房图标：绘制一个简单的房子/厨房图标
        # 屋顶
        points = [(SIZE*0.2, SIZE*0.5), (SIZE*0.5, SIZE*0.2), (SIZE*0.8, SIZE*0.5)]
        draw.polygon(points, fill=color)
        # 房子主体
        draw.rectangle([SIZE*0.3, SIZE*0.5, SIZE*0.7, SIZE*0.8], fill=color)
        # 门
        door_color = (255, 255, 255, 200) if is_active else (200, 200, 200, 200)
        draw.rectangle([SIZE*0.4, SIZE*0.6, SIZE*0.6, SIZE*0.8], fill=door_color)
        
    elif icon_type == 'order':
        # 订单图标：绘制一个购物袋/列表图标
        # 袋子主体
        draw.rectangle([SIZE*0.25, SIZE*0.3, SIZE*0.75, SIZE*0.75], outline=color, width=4)
        # 袋子提手
        draw.arc([SIZE*0.25, SIZE*0.25, SIZE*0.75, SIZE*0.45], start=0, end=180, fill=color, width=4)
        # 添加一些线条表示订单
        for i in range(3):
            y = SIZE * (0.45 + i * 0.1)
            draw.line([SIZE*0.35, y, SIZE*0.65, y], fill=color, width=2)
            
    elif icon_type == 'profile':
        # 我的图标：绘制一个用户头像图标
        # 头部（圆形）
        center = (SIZE // 2, SIZE * 0.35)
        radius = SIZE * 0.15
        draw.ellipse([center[0] - radius, center[1] - radius,
                     center[0] + radius, center[1] + radius], fill=color)
        # 身体（半圆）
        body_top = center[1] + radius
        draw.ellipse([SIZE*0.2, body_top, SIZE*0.8, SIZE*0.85], fill=color)
    
    return img

def main():
    """生成所有图标"""
    icons = [
        ('kitchen', '厨房'),
        ('order', '订单'),
        ('profile', '我的')
    ]
    
    print("开始生成 TabBar 图标...")
    
    for icon_type, name in icons:
        # 生成未选中状态
        img_normal = create_icon(icon_type, is_active=False)
        normal_path = os.path.join(TABBAR_DIR, f"{icon_type}.png")
        img_normal.save(normal_path)
        print(f"✅ 已生成: {normal_path} ({name} - 未选中)")
        
        # 生成选中状态
        img_active = create_icon(icon_type, is_active=True)
        active_path = os.path.join(TABBAR_DIR, f"{icon_type}-active.png")
        img_active.save(active_path)
        print(f"✅ 已生成: {active_path} ({name} - 选中)")
    
    print("\n所有图标生成完成！")
    print(f"图标保存在: {TABBAR_DIR}/")

if __name__ == "__main__":
    try:
        main()
    except ImportError:
        print("错误: 需要安装 Pillow 库")
        print("请运行: pip install Pillow")
    except Exception as e:
        print(f"生成图标时出错: {e}")
