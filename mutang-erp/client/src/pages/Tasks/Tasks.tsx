import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/src/components/ui/tabs';
import BasicTasksPanel from './BasicTasksPanel';
import TodosPanel from './todos/TodosPanel';
import CollaborationTasksPanel from './collaboration/CollaborationTasksPanel';
import BatchImportsPanel from './batch-imports/BatchImportsPanel';
import BatchExportsPanel from './batch-exports/BatchExportsPanel';

const Tasks = () => (
  <div className="space-y-6">
    <Tabs defaultValue="todos">
      <TabsList className="rounded-none bg-white p-1 shadow-md">
        <TabsTrigger
          value="todos"
          className="rounded-none data-[state=active]:bg-[#0033A0] data-[state=active]:text-white"
        >
          我的待办
        </TabsTrigger>
        <TabsTrigger
          value="collaboration"
          className="rounded-none data-[state=active]:bg-[#0033A0] data-[state=active]:text-white"
        >
          协作任务
        </TabsTrigger>
        <TabsTrigger
          value="imports"
          className="rounded-none data-[state=active]:bg-[#0033A0] data-[state=active]:text-white"
        >
          批量导入
        </TabsTrigger>
        <TabsTrigger
          value="exports"
          className="rounded-none data-[state=active]:bg-[#0033A0] data-[state=active]:text-white"
        >
          批量导出
        </TabsTrigger>
        <TabsTrigger
          value="basic"
          className="rounded-none data-[state=active]:bg-[#0033A0] data-[state=active]:text-white"
        >
          任务列表
        </TabsTrigger>
      </TabsList>
      <TabsContent value="todos">
        <TodosPanel />
      </TabsContent>
      <TabsContent value="collaboration">
        <CollaborationTasksPanel />
      </TabsContent>
      <TabsContent value="imports">
        <BatchImportsPanel />
      </TabsContent>
      <TabsContent value="exports">
        <BatchExportsPanel />
      </TabsContent>
      <TabsContent value="basic">
        <BasicTasksPanel />
      </TabsContent>
    </Tabs>
  </div>
);

export default Tasks;
