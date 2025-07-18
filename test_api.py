#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json
import time

class TrainTicketAPITester:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        self.session = requests.Session()
    
    def test_get_trains(self):
        """测试查询火车信息"""
        print("=== 测试查询火车信息 ===")
        try:
            response = self.session.get(f"{self.base_url}/trains")
            print(f"状态码: {response.status_code}")
            print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            return response.status_code == 200
        except Exception as e:
            print(f"错误: {e}")
            return False
    
    def test_get_stops(self, train_id=1):
        """测试查询经停站信息"""
        print(f"\n=== 测试查询经停站信息 (车次ID: {train_id}) ===")
        try:
            response = self.session.get(f"{self.base_url}/stops/{train_id}")
            print(f"状态码: {response.status_code}")
            print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            return response.status_code == 200
        except Exception as e:
            print(f"错误: {e}")
            return False
    
    def test_search_bookable_trains(self):
        """测试查询可预订车次"""
        print("\n=== 测试查询可预订车次 ===")
        try:
            data = {
                "fromStation": "北京",
                "toStation": "上海",
                "date": "2025-07-17"
            }
            response = self.session.post(f"{self.base_url}/search-bookable-trains", json=data)
            print(f"状态码: {response.status_code}")
            print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            return response.status_code == 200
        except Exception as e:
            print(f"错误: {e}")
            return False
    
    def test_book_ticket(self):
        """测试预订车票"""
        print("\n=== 测试预订车票 ===")
        try:
            data = {
                "trainId": 1,
                "seatType": "二等座",
                "passengerName": "张三",
                "passengerId": "110101199001011234",
                "fromStation": "北京",
                "toStation": "上海",
                "date": "2025-07-17"
            }
            response = self.session.post(f"{self.base_url}/book", json=data)
            print(f"状态码: {response.status_code}")
            print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            return response.status_code == 200
        except Exception as e:
            print(f"错误: {e}")
            return False
    
    def test_get_orders(self):
        """测试查询订单"""
        print("\n=== 测试查询订单 ===")
        try:
            params = {
                "passengerName": "张三",
                "passengerId": "110101199001011234"
            }
            response = self.session.get(f"{self.base_url}/orders", params=params)
            print(f"状态码: {response.status_code}")
            print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            return response.status_code == 200
        except Exception as e:
            print(f"错误: {e}")
            return False
    
    def test_delete_order(self, order_id=1):
        """测试取消订单"""
        print(f"\n=== 测试取消订单 (订单ID: {order_id}) ===")
        try:
            response = self.session.delete(f"{self.base_url}/orders/{order_id}")
            print(f"状态码: {response.status_code}")
            print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            return response.status_code == 200
        except Exception as e:
            print(f"错误: {e}")
            return False
    
    def test_restore_order(self, order_id=1):
        """测试恢复订单"""
        print(f"\n=== 测试恢复订单 (订单ID: {order_id}) ===")
        try:
            response = self.session.put(f"{self.base_url}/orders/{order_id}/restore")
            print(f"状态码: {response.status_code}")
            print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            return response.status_code == 200
        except Exception as e:
            print(f"错误: {e}")
            return False
    
    def test_get_deleted_orders(self):
        """测试查询已删除订单"""
        print("\n=== 测试查询已删除订单 ===")
        try:
            params = {
                "passengerName": "张三"
            }
            response = self.session.get(f"{self.base_url}/orders/deleted", params=params)
            print(f"状态码: {response.status_code}")
            print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            return response.status_code == 200
        except Exception as e:
            print(f"错误: {e}")
            return False
    
    def test_db_connection(self):
        """测试数据库连接"""
        print("\n=== 测试数据库连接 ===")
        try:
            response = self.session.get(f"{self.base_url}/test-db")
            print(f"状态码: {response.status_code}")
            print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
            return response.status_code == 200
        except Exception as e:
            print(f"错误: {e}")
            return False
    
    def run_all_tests(self):
        """运行所有测试"""
        print("开始API测试...")
        print("=" * 50)
        
        tests = [
            ("数据库连接测试", self.test_db_connection),
            ("查询火车信息", self.test_get_trains),
            ("查询经停站信息", lambda: self.test_get_stops(1)),
            ("查询可预订车次", self.test_search_bookable_trains),
            ("预订车票", self.test_book_ticket),
            ("查询订单", self.test_get_orders),
            ("取消订单", lambda: self.test_delete_order(1)),
            ("查询已删除订单", self.test_get_deleted_orders),
            ("恢复订单", lambda: self.test_restore_order(1)),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n正在执行: {test_name}")
            if test_func():
                print(f"✓ {test_name} 通过")
                passed += 1
            else:
                print(f"✗ {test_name} 失败")
            time.sleep(0.5)  # 避免请求过快
        
        print("\n" + "=" * 50)
        print(f"测试完成: {passed}/{total} 通过")
        
        if passed == total:
            print("🎉 所有测试通过！")
        else:
            print("❌ 部分测试失败，请检查服务器状态")
        
        return passed == total

def main():
    print("火车票售票系统 API 测试工具")
    print("请确保fake server正在运行在 http://localhost:3000")
    print()
    
    tester = TrainTicketAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n测试被用户中断")
        return 1
    except Exception as e:
        print(f"测试过程中发生错误: {e}")
        return 1

if __name__ == "__main__":
    exit(main()) 