import time

def bubble_sort_descending(arr):
    """
    Sorts an array in descending order using bubble sort algorithm.
    Time Complexity: O(n²)
    """
    n = len(arr)
    arr_copy = arr.copy()
    
    for i in range(n):
        swapped = False
        for j in range(0, n - i - 1):
            if arr_copy[j] < arr_copy[j + 1]:
                arr_copy[j], arr_copy[j + 1] = arr_copy[j + 1], arr_copy[j]
                swapped = True
        if not swapped:
            break
    
    return arr_copy

def insertion_sort_descending(arr):
    """
    Sorts an array in descending order using insertion sort algorithm.
    Time Complexity: O(n²)
    """
    arr_copy = arr.copy()
    
    for i in range(1, len(arr_copy)):
        key = arr_copy[i]
        j = i - 1
        while j >= 0 and arr_copy[j] < key:
            arr_copy[j + 1] = arr_copy[j]
            j -= 1
        arr_copy[j + 1] = key
    
    return arr_copy

def merge_sort_descending(arr):
    """
    Sorts an array in descending order using merge sort algorithm.
    Time Complexity: O(n log n)
    """
    if len(arr) <= 1:
        return arr.copy()
    
    def merge(left, right):
        result = []
        i = j = 0
        
        while i < len(left) and j < len(right):
            if left[i] >= right[j]:
                result.append(left[i])
                i += 1
            else:
                result.append(right[j])
                j += 1
        
        result.extend(left[i:])
        result.extend(right[j:])
        return result
    
    def merge_sort_helper(arr):
        if len(arr) <= 1:
            return arr
        
        mid = len(arr) // 2
        left = merge_sort_helper(arr[:mid])
        right = merge_sort_helper(arr[mid:])
        
        return merge(left, right)
    
    return merge_sort_helper(arr.copy())

def load_data_from_file(filename='data.txt'):
    """Load data from text file"""
    try:
        with open(filename, 'r') as file:
            data = []
            for line in file:
                line = line.strip()
                if line:
                    data.append(int(line))
        return data
    except FileNotFoundError:
        print(f"Error: {filename} file not found!")
        return None
    except ValueError as e:
        print(f"Error: Invalid data in file - {e}")
        return None

def load_custom_dataset():
    """Load custom dataset from user input"""
    print("\n" + "=" * 60)
    print("CUSTOM DATASET INPUT")
    print("=" * 60)
    print("Choose input method:")
    print("1. Enter numbers manually (comma-separated)")
    print("2. Load from a custom file")
    print("3. Generate random numbers")
    print("=" * 60)
    
    choice = input("\nEnter your choice (1-3): ").strip()
    
    if choice == '1':
        return enter_manual_data()
    elif choice == '2':
        return load_from_custom_file()
    elif choice == '3':
        return generate_random_data()
    else:
        print("❌ Invalid choice!")
        return None

def enter_manual_data():
    """Enter data manually"""
    print("\nEnter numbers separated by commas (e.g., 5, 3, 8, 1, 9):")
    user_input = input("Numbers: ").strip()
    
    try:
        data = [int(x.strip()) for x in user_input.split(',')]
        if len(data) == 0:
            print("❌ No data entered!")
            return None
        print(f"✓ Successfully loaded {len(data)} numbers")
        return data
    except ValueError:
        print("❌ Invalid input! Please enter valid integers separated by commas.")
        return None

def load_from_custom_file():
    """Load data from custom file"""
    filename = input("\nEnter the filename (e.g., mydata.txt): ").strip()
    data = load_data_from_file(filename)
    if data:
        print(f"✓ Successfully loaded {len(data)} numbers from {filename}")
    return data

def generate_random_data():
    """Generate random dataset"""
    import random
    
    try:
        size = int(input("\nEnter the number of elements to generate: ").strip())
        if size <= 0:
            print("❌ Size must be positive!")
            return None
        
        min_val = int(input("Enter minimum value: ").strip())
        max_val = int(input("Enter maximum value: ").strip())
        
        if min_val >= max_val:
            print("❌ Minimum value must be less than maximum value!")
            return None
        
        data = [random.randint(min_val, max_val) for _ in range(size)]
        print(f"✓ Successfully generated {len(data)} random numbers")
        return data
    except ValueError:
        print("❌ Invalid input! Please enter valid integers.")
        return None

def display_results(sorted_data, elapsed_time, algorithm_name):
    """Display sorting results"""
    print("\n" + "=" * 60)
    print(f"Algorithm: {algorithm_name}")
    print("=" * 60)
    print(f"\nSorted array (Descending Order):")
    if len(sorted_data) <= 50:
        print(sorted_data)
    else:
        print(f"First 25 elements: {sorted_data[:25]}")
        print(f"Last 25 elements: {sorted_data[-25:]}")
    print("\n" + "=" * 60)
    print(f"Time spent: {elapsed_time:.6f} seconds")
    print(f"Time spent: {elapsed_time * 1000:.3f} milliseconds")
    print("=" * 60)
    print(f"\nVerification:")
    print(f"Array size: {len(sorted_data)}")
    print(f"Maximum value: {sorted_data[0]}")
    print(f"Minimum value: {sorted_data[-1]}")
    print("=" * 60)

def perform_sort(data, sort_function, algorithm_name):
    """Execute sorting and measure time"""
    print(f"\nExecuting {algorithm_name}...")
    
    start_time = time.time()
    sorted_data = sort_function(data)
    end_time = time.time()
    
    elapsed_time = end_time - start_time
    display_results(sorted_data, elapsed_time, algorithm_name)

def display_menu():
    """Display menu options"""
    print("\n" + "=" * 60)
    print("SORTING ALGORITHMS - DESCENDING ORDER")
    print("=" * 60)
    print("1. Bubble Sort")
    print("2. Insertion Sort")
    print("3. Merge Sort")
    print("4. Compare All Algorithms")
    print("5. Load New Dataset")
    print("6. Exit")
    print("=" * 60)

def compare_all_algorithms(data):
    """Compare execution time of all sorting algorithms"""
    print("\n" + "=" * 60)
    print("COMPARING ALL SORTING ALGORITHMS")
    print("=" * 60)
    
    algorithms = [
        ("Bubble Sort", bubble_sort_descending),
        ("Insertion Sort", insertion_sort_descending),
        ("Merge Sort", merge_sort_descending)
    ]
    
    results = []
    
    for name, func in algorithms:
        print(f"\nExecuting {name}...")
        start_time = time.time()
        sorted_data = func(data)
        end_time = time.time()
        elapsed_time = end_time - start_time
        results.append((name, elapsed_time))
        print(f"  ✓ Completed in {elapsed_time:.6f} seconds ({elapsed_time * 1000:.3f} ms)")
    
    print("\n" + "=" * 60)
    print("PERFORMANCE COMPARISON")
    print("=" * 60)
    print(f"{'Algorithm':<20} {'Time (seconds)':<20} {'Time (ms)':<15}")
    print("-" * 60)
    
    for name, elapsed_time in results:
        print(f"{name:<20} {elapsed_time:<20.6f} {elapsed_time * 1000:<15.3f}")
    
    print("=" * 60)
    
    fastest = min(results, key=lambda x: x[1])
    print(f"\nFastest Algorithm: {fastest[0]} ({fastest[1]:.6f} seconds)")
    print("=" * 60)

def choose_data_source():
    """Choose initial data source"""
    print("\n" + "=" * 60)
    print("DATA SOURCE SELECTION")
    print("=" * 60)
    print("1. Load from data.txt (default)")
    print("2. Use custom dataset")
    print("=" * 60)
    
    choice = input("\nEnter your choice (1-2): ").strip()
    
    if choice == '2':
        return load_custom_dataset()
    else:
        print("\nLoading data from data.txt...")
        return load_data_from_file('data.txt')

def main():
    """Main program"""
    print("=" * 60)
    print("SORTING ALGORITHMS PROGRAM")
    print("=" * 60)
    
    # Choose data source
    data = choose_data_source()
    
    if data is None:
        print("\n❌ Failed to load data. Exiting program.")
        return
    
    print(f"\n✓ Successfully loaded {len(data)} numbers")
    if len(data) <= 20:
        print(f"Dataset: {data}")
    else:
        print(f"First 10 elements: {data[:10]}")
        print(f"Last 10 elements: {data[-10:]}")
    
    while True:
        display_menu()
        choice = input("\nEnter your choice (1-6): ").strip()
        
        if choice == '1':
            perform_sort(data, bubble_sort_descending, "Bubble Sort")
        elif choice == '2':
            perform_sort(data, insertion_sort_descending, "Insertion Sort")
        elif choice == '3':
            perform_sort(data, merge_sort_descending, "Merge Sort")
        elif choice == '4':
            compare_all_algorithms(data)
        elif choice == '5':
            new_data = load_custom_dataset()
            if new_data:
                data = new_data
                print(f"\n✓ Dataset updated! Now using {len(data)} numbers")
                if len(data) <= 20:
                    print(f"New dataset: {data}")
                else:
                    print(f"First 10 elements: {data[:10]}")
                    print(f"Last 10 elements: {data[-10:]}")
            else:
                print("\n❌ Failed to load new dataset. Keeping current data.")
        elif choice == '6':
            print("\n" + "=" * 60)
            print("Thank you for using the Sorting Algorithms Program!")
            print("=" * 60)
            break
        else:
            print("\n❌ Invalid choice! Please enter a number between 1 and 6.")
        
        if choice in ['1', '2', '3', '4', '5']:
            input("\nPress Enter to continue...")

if __name__ == "__main__":
    main()